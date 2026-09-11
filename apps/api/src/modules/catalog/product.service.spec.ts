import "reflect-metadata";
import { describe, expect, it, vi } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { ProductService } from "./product.service";
import type { CreateProductDto, UpdateProductDto } from "./catalog.dto";

const decimal = (value: string) => ({ toString: () => value });
function commodity() {
  return { id: "tomato", name: "Tomat", category: "BUAH_UMBI", shrinkTolerancePct: decimal("3.5"), avgYieldKgPerHa: decimal("8000"), gradeStandards: { A: "Utuh" } };
}
function product() {
  return { id: "product-1", name: "Tomat segar", grade: "A", pricePerBox: 50_000, qtyKgPerBox: decimal("5.5"), stockBox: 6,
    estHarvestDate: new Date("2026-09-20T00:00:00Z"), description: "Dipetik pagi", commodity: commodity() };
}
const normalizedCommodity = { id: "tomato", name: "Tomat", category: "BUAH_UMBI", shrinkTolerancePct: 3.5, avgYieldKgPerHa: 8000, gradeStandards: { A: "Utuh" } };
const normalizedProduct = { id: "product-1", name: "Tomat segar", grade: "A", pricePerBox: 50_000, qtyKgPerBox: 5.5, stockBox: 6,
  estHarvestDate: "2026-09-20", description: "Dipetik pagi", commodity: normalizedCommodity };
const createDto: CreateProductDto = { commodityId: "tomato", name: "Tomat segar", grade: "A", pricePerBox: 50_000, qtyKgPerBox: 5.5, estHarvestDate: "2026-09-20" };

function fixture() {
  const prisma = {
    commodity: { findMany: vi.fn().mockResolvedValue([commodity()]), findUnique: vi.fn().mockResolvedValue(commodity()) },
    product: { findMany: vi.fn().mockResolvedValue([product()]), findFirst: vi.fn().mockResolvedValue(product()),
      create: vi.fn().mockResolvedValue({ id: "product-1" }), update: vi.fn().mockResolvedValue({ id: "product-1" }) },
  };
  return { prisma, service: new ProductService(prisma as never) };
}

describe("ProductService commodity and tenant-owned reads", () => {
  it("normalizes commodity decimal fields and requests alphabetical order", async () => {
    const f = fixture(); expect(await f.service.listCommodities()).toEqual([normalizedCommodity]);
    expect(f.prisma.commodity.findMany).toHaveBeenCalledExactlyOnceWith({ orderBy: { name: "asc" } });
  });

  it("returns an empty commodity list without inventing defaults", async () => {
    const f = fixture(); f.prisma.commodity.findMany.mockResolvedValue([]);
    expect(await f.service.listCommodities()).toEqual([]);
  });

  it("scopes the list to its tenant and converts Decimal/date values to public fields", async () => {
    const f = fixture(); expect(await f.service.findAll("tenant-1")).toEqual([normalizedProduct]);
    expect(f.prisma.product.findMany).toHaveBeenCalledExactlyOnceWith({ where: { tenantId: "tenant-1" }, include: { commodity: true }, orderBy: { estHarvestDate: "asc" } });
  });

  it("does not leak another tenant's products in an empty scoped list", async () => {
    const f = fixture(); f.prisma.product.findMany.mockResolvedValue([]);
    expect(await f.service.findAll("other-tenant")).toEqual([]);
    expect(f.prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "other-tenant" } }));
  });

  it("requires both product identity and tenant ownership for a single read", async () => {
    const f = fixture(); expect(await f.service.findOne("tenant-1", "product-1")).toEqual(normalizedProduct);
    expect(f.prisma.product.findFirst).toHaveBeenCalledExactlyOnceWith({ where: { id: "product-1", tenantId: "tenant-1" }, include: { commodity: true } });
  });

  it("conceals missing or foreign-owned products behind not found", async () => {
    const f = fixture(); f.prisma.product.findFirst.mockResolvedValue(null);
    await expect(f.service.findOne("tenant-2", "product-1")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ProductService creation", () => {
  it("rejects an unknown commodity without writing a product", async () => {
    const f = fixture(); f.prisma.commodity.findUnique.mockResolvedValue(null);
    await expect(f.service.create("tenant-1", createDto)).rejects.toMatchObject({ response: { code: "COMMODITY_UNKNOWN" } });
    expect(f.prisma.product.create).not.toHaveBeenCalled();
  });

  it("binds new products to the supplied tenant and defaults optional fields", async () => {
    const f = fixture(); expect(await f.service.create("tenant-1", createDto)).toEqual(normalizedProduct);
    expect(f.prisma.commodity.findUnique).toHaveBeenCalledWith({ where: { id: "tomato" } });
    expect(f.prisma.product.create).toHaveBeenCalledExactlyOnceWith({ data: {
      tenantId: "tenant-1", commodityId: "tomato", name: "Tomat segar", grade: "A", pricePerBox: 50_000,
      qtyKgPerBox: 5.5, stockBox: 0, description: null, estHarvestDate: new Date("2026-09-20"),
    } });
    expect(f.prisma.product.findFirst).toHaveBeenCalledWith({ where: { id: "product-1", tenantId: "tenant-1" }, include: { commodity: true } });
  });

  it.each([{ stockBox: 12, description: "Dipanen pagi" }, { stockBox: 0, description: "" }])("preserves explicit optional values %j", async (optional) => {
    const f = fixture(); await f.service.create("tenant-1", { ...createDto, ...optional });
    expect(f.prisma.product.create).toHaveBeenCalledWith({ data: expect.objectContaining(optional) });
  });

  it("propagates database failure without pretending the product was created", async () => {
    const f = fixture(); const failure = new Error("write unavailable"); f.prisma.product.create.mockRejectedValue(failure);
    await expect(f.service.create("tenant-1", createDto)).rejects.toBe(failure);
    expect(f.prisma.product.findFirst).not.toHaveBeenCalled();
  });
});

describe("ProductService partial updates", () => {
  it("rejects a foreign-owned product before mutation", async () => {
    const f = fixture(); f.prisma.product.findFirst.mockResolvedValue(null);
    await expect(f.service.update("tenant-2", "product-1", { pricePerBox: 1 })).rejects.toBeInstanceOf(NotFoundException);
    expect(f.prisma.product.update).not.toHaveBeenCalled();
  });

  it("leaves all persisted fields untouched when no changes are supplied", async () => {
    const f = fixture(); expect(await f.service.update("tenant-1", "product-1", {})).toEqual(normalizedProduct);
    expect(f.prisma.product.update).toHaveBeenCalledExactlyOnceWith({ where: { id: "product-1" }, data: {} });
    expect(f.prisma.product.findFirst).toHaveBeenCalledTimes(2);
  });

  it("updates every editable field and returns the freshly read product", async () => {
    const f = fixture();
    const dto: UpdateProductDto = { name: "Tomat merah", grade: "B", pricePerBox: 35_000, qtyKgPerBox: 3.5, stockBox: 0, estHarvestDate: "2026-10-01", description: "" };
    f.prisma.product.findFirst.mockResolvedValueOnce(product()).mockResolvedValueOnce({ ...product(), ...dto, estHarvestDate: new Date(dto.estHarvestDate!) });
    expect(await f.service.update("tenant-1", "product-1", dto)).toMatchObject(dto);
    expect(f.prisma.product.update).toHaveBeenCalledExactlyOnceWith({ where: { id: "product-1" }, data: { ...dto, estHarvestDate: new Date("2026-10-01") } });
  });

  it.each([
    ["name", "Tomat lokal"], ["grade", "C"], ["pricePerBox", 25_000], ["qtyKgPerBox", 2.25],
    ["stockBox", 0], ["estHarvestDate", "2026-10-05"], ["description", ""],
  ] as const)("updates only %s when other fields are omitted", async (field, value) => {
    const f = fixture(); await f.service.update("tenant-1", "product-1", { [field]: value });
    expect(f.prisma.product.update).toHaveBeenCalledWith({ where: { id: "product-1" }, data: { [field]: field === "estHarvestDate" ? new Date(String(value)) : value } });
  });

  it("does not perform a misleading successful reread when persistence fails", async () => {
    const f = fixture(); const failure = new Error("database offline"); f.prisma.product.update.mockRejectedValue(failure);
    await expect(f.service.update("tenant-1", "product-1", { name: "Tomat lokal" })).rejects.toBe(failure);
    expect(f.prisma.product.findFirst).toHaveBeenCalledTimes(1);
  });
});
