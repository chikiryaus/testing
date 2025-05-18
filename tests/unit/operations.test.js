import { TinkoffInvestApi } from "tinkoff-invest-api";
// Предполагаемый путь к enum, проверьте его в вашем SDK
import { PortfolioRequest_CurrencyRequest } from "tinkoff-invest-api/dist/generated/operations.js";

describe("OperationsService Unit Tests (via TinkoffInvestApi)", () => {
  let api;
  let getPortfolioSpy;

  const VALID_ACCOUNT_ID = "acc789";
  const INVALID_ACCOUNT_ID = "invalid_acc_id";

  beforeEach(() => {
    api = new TinkoffInvestApi({ token: "mock-token-unit-ops" });
    getPortfolioSpy = jest.spyOn(api.operations, "getPortfolio");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TC-ACC-02: Получение портфеля для существующего счета
  test("TC-ACC-02: getPortfolio should return portfolio for a valid account ID", async () => {
    const mockPortfolioResponse = {
      totalAmountShares: { units: 1000, nano: 0, currency: "rub" },
      totalAmountBonds: { units: 500, nano: 0, currency: "rub" },
      positions: [
        {
          figi: "BBG004730N88",
          quantity: { units: 10, nano: 0 },
          averagePositionPrice: { units: 250, nano: 0, currency: "rub" },
          instrumentType: "share",
        },
      ],
      accountId: VALID_ACCOUNT_ID,
    };
    getPortfolioSpy.mockResolvedValue(mockPortfolioResponse);

    const portfolio = await api.operations.getPortfolio({
      accountId: VALID_ACCOUNT_ID,
      currency: PortfolioRequest_CurrencyRequest.RUB,
    });

    expect(getPortfolioSpy).toHaveBeenCalledWith({
      accountId: VALID_ACCOUNT_ID,
      currency: PortfolioRequest_CurrencyRequest.RUB,
    });
    expect(portfolio).toEqual(mockPortfolioResponse);
    expect(portfolio.totalAmountShares.currency).toBe("rub");
    expect(portfolio.positions).toHaveLength(1);
  });

  // TC-ACC-03: Попытка получения портфеля для несуществующего счета
  test("TC-ACC-03: getPortfolio should throw error for an invalid account ID", async () => {
    const errorMessage = "Error: 70002, Account not found or access denied."; // Пример ошибки
    getPortfolioSpy.mockRejectedValue(new Error(errorMessage));

    await expect(
      api.operations.getPortfolio({
        accountId: INVALID_ACCOUNT_ID,
        currency: PortfolioRequest_CurrencyRequest.RUB,
      })
    ).rejects.toThrow(errorMessage);

    expect(getPortfolioSpy).toHaveBeenCalledWith({
      accountId: INVALID_ACCOUNT_ID,
      currency: PortfolioRequest_CurrencyRequest.RUB,
    });
  });
});
