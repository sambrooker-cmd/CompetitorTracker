import { prisma } from "./lib/prisma";

/**
 * Seeds demo data pointed at books.toscrape.com, a site built specifically
 * for scraping practice (no ToS concerns), so the tracker works end-to-end
 * out of the box. Replace with your real competitors/products afterwards.
 */
async function main() {
  const competitor = await prisma.competitor.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Demo Bookstore",
      website: "https://books.toscrape.com",
      notes: "Sample competitor using books.toscrape.com (a public scraping sandbox).",
    },
  });

  await prisma.product.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "A Light in the Attic",
      url: "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
      priceSelector: "p.price_color",
      promoSelector: "p.instock.availability",
      currency: "GBP",
      competitorId: competitor.id,
    },
  });

  await prisma.product.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Soumission",
      url: "https://books.toscrape.com/catalogue/soumission_998/index.html",
      priceSelector: "p.price_color",
      promoSelector: "p.instock.availability",
      currency: "GBP",
      competitorId: competitor.id,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
