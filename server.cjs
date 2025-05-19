// server.js (примерная обертка)
const express = require("express");
const { TinkoffInvestApi } = require("tinkoff-invest-api"); // Путь к вашему SDK
// const { PortfolioRequest_CurrencyRequest } = require('tinkoff-invest-api/dist/generated/operations.js');

const app = express();
const port = 3000;

// !!! ВАЖНО: Для реального Sandbox API токен нужно получать безопасно
// Для мокирования токен может быть любым
const token =
  "t.fw7iTurYbenwWQp049ocrLNghDNN1I8R6Gf2Mvvz-6C4fWeFE6IM29_mV2jVw0vaSyVGJB-jJ6ls6HAP46awDw";
const api = new TinkoffInvestApi({ token });

// --- НАЧАЛО МОКИРОВАНИЯ (для Подхода А) ---
// Это нужно делать, если мы не используем реальный Sandbox
// В реальном приложении этого не будет, оно будет просто использовать SDK
if (!process.env.USE_REAL_API) {
  console.log("Using MOCKED API for Tinkoff SDK");
  const mockPortfolio = {
    totalAmountShares: { units: 1000, nano: 0, currency: "rub" },
    positions: [{ figi: "BBG004730N88", quantity: { units: 10, nano: 0 } }],
  };
  // Вместо jest.spyOn, мы можем просто переопределить метод для этого экземпляра
  // или создать мок-версию сервиса. Для простоты переопределим:
  api.operations.getPortfolio = async (params) => {
    console.log(`Mocked getPortfolio called with:`, params);
    // Искусственная задержка для симуляции работы
    await new Promise((res) => setTimeout(res, Math.random() * 50 + 20)); // 20-70ms
    return mockPortfolio;
  };
}
// --- КОНЕЦ МОКИРОВАНИЯ ---

app.get("/portfolio/:accountId", async (req, res) => {
  try {
    const portfolio = await api.operations.getPortfolio({
      accountId: req.params.accountId,
      // currency: PortfolioRequest_CurrencyRequest.RUB // Убедитесь, что enum доступен
      currency: 1, // Используем числовое значение для простоты, если импорт enum сложен
    });
    res.json(portfolio);
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`SDK test server listening on port ${port}`);
});
