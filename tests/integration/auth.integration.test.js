import { TinkoffInvestApi } from "tinkoff-invest-api";
// Импорты enum, если они нужны для параметров методов, которые вызываются
// import { PortfolioRequest_CurrencyRequest } from 'tinkoff-invest-api/dist/generated/operations.js';

describe("Authentication and Core API Interaction Integration Tests", () => {
  // В интеграционных тестах мы будем создавать новый экземпляр `api` для каждого сценария токена,
  // но по-прежнему мокать нижележащие вызовы сервисов, чтобы не делать реальных сетевых запросов.
  // "Интеграция" здесь - это проверка того, что TinkoffInvestApi правильно
  // инициализируется с токеном и как это влияет на вызовы.

  const VALID_TOKEN = "your-real-or-sandbox-token-for-mocked-tests"; // Не будет использоваться для реальных вызовов
  const INVALID_TOKEN = "invalid-or-expired-token";
  const EMPTY_TOKEN = ""; // Пустой токен

  // TC-AUTH-01: Успешная аутентификация с валидным токеном
  // (проверяется косвенно через успешный вызов другого метода)
  test("TC-AUTH-01: API calls should succeed when TinkoffInvestApi is initialized with a valid token", async () => {
    const api = new TinkoffInvestApi({ token: VALID_TOKEN });
    const getAccountsSpy = jest.spyOn(api.users, "getAccounts"); // Шпионим уже на конкретном экземпляре

    const mockAccountsResponse = {
      accounts: [{ id: "acc1", name: "Account 1", type: 1 }],
    };
    getAccountsSpy.mockResolvedValue(mockAccountsResponse); // Мокаем ответ метода

    const result = await api.users.getAccounts({});
    expect(result).toEqual(mockAccountsResponse);
    expect(getAccountsSpy).toHaveBeenCalledTimes(1);

    getAccountsSpy.mockRestore(); // Восстанавливаем оригинальный метод
  });

  // TC-AUTH-02: Неуспешная аутентификация с невалидным токеном
  test("TC-AUTH-02: API calls should fail when TinkoffInvestApi is initialized with an invalid token", async () => {
    const api = new TinkoffInvestApi({ token: INVALID_TOKEN });
    const getAccountsSpy = jest.spyOn(api.users, "getAccounts");

    const authError = new Error(
      "Unary Stream Error: 7, Request unauthenticated. Provide a valid token."
    ); // Пример ошибки gRPC
    getAccountsSpy.mockRejectedValue(authError); // Мокаем, что вызов вернет ошибку аутентификации

    await expect(api.users.getAccounts({})).rejects.toThrow(authError.message);
    expect(getAccountsSpy).toHaveBeenCalledTimes(1);

    getAccountsSpy.mockRestore();
  });

  // TC-AUTH-03: Попытка аутентификации с пустым токеном
  test("TC-AUTH-03: API client initialization or first call should fail with an empty token", async () => {
    // Поведение SDK с пустым токеном может быть разным:
    // 1. Ошибка при создании экземпляра TinkoffInvestApi (менее вероятно, если он ленивый).
    // 2. Ошибка при первом вызове API.

    // Проверяем второй вариант: ошибка при первом вызове
    const api = new TinkoffInvestApi({ token: EMPTY_TOKEN });
    const getAccountsSpy = jest.spyOn(api.users, "getAccounts");

    // Ошибка может быть той же, что и при невалидном токене, или специфической
    const configError = new Error(
      "Unary Stream Error: 7, Request unauthenticated. Token is missing."
    );
    getAccountsSpy.mockRejectedValue(configError); // Мокаем ошибку, которую вернет вызов

    await expect(api.users.getAccounts({})).rejects.toThrow(
      configError.message
    );
    expect(getAccountsSpy).toHaveBeenCalledTimes(1);

    getAccountsSpy.mockRestore();
  });

  // Дополнительный интеграционный тест: связка "валидный токен -> запрос портфеля"
  // Это косвенно покрывает TC-ACC-02 в контексте интеграции с аутентификацией
  test("Integration: Valid token allows fetching portfolio (mocked portfolio call)", async () => {
    const api = new TinkoffInvestApi({ token: VALID_TOKEN });
    const getPortfolioSpy = jest.spyOn(api.operations, "getPortfolio");
    // Импортируем, если еще не импортирован вверху файла
    const { PortfolioRequest_CurrencyRequest } = await import(
      "tinkoff-invest-api/dist/generated/operations.js"
    );

    const mockPortfolio = {
      totalAmountShares: { units: 100, nano: 0, currency: "rub" },
      accountId: "testAccId",
    };
    getPortfolioSpy.mockResolvedValue(mockPortfolio);

    const portfolio = await api.operations.getPortfolio({
      accountId: "testAccId",
      currency: PortfolioRequest_CurrencyRequest.RUB,
    });
    expect(portfolio).toEqual(mockPortfolio);
    expect(getPortfolioSpy).toHaveBeenCalledWith({
      accountId: "testAccId",
      currency: PortfolioRequest_CurrencyRequest.RUB,
    });

    getPortfolioSpy.mockRestore();
  });

  // INT-AUTH-OPS-01: Успешный запрос портфеля после успешной аутентификации (повтор для другого сервиса)
  // Этот тест похож на 'Integration: Valid token allows fetching portfolio',
  // но мы можем его сделать более явным и отдельным.
  test("[INT-AUTH-OPS-01] Successfully fetching portfolio after initializing with a valid token", async () => {
    const api = new TinkoffInvestApi({ token: VALID_TOKEN });
    const getPortfolioSpy = jest.spyOn(api.operations, "getPortfolio");
    const { PortfolioRequest_CurrencyRequest } = await import(
      "tinkoff-invest-api/dist/generated/operations.js"
    );

    const mockPortfolioResponse = {
      totalAmountShares: { units: 1234, nano: 0, currency: "rub" },
      positions: [],
      accountId: "validAccId",
    };
    getPortfolioSpy.mockResolvedValue(mockPortfolioResponse);

    const portfolio = await api.operations.getPortfolio({
      accountId: "validAccId",
      currency: PortfolioRequest_CurrencyRequest.RUB,
    });

    expect(getPortfolioSpy).toHaveBeenCalledWith({
      accountId: "validAccId",
      currency: PortfolioRequest_CurrencyRequest.RUB,
    });
    expect(portfolio).toEqual(mockPortfolioResponse);
    getPortfolioSpy.mockRestore();
  });

  // INT-CONFIG-01: Проверка, что хелперы доступны и работают после инициализации API
  // (хотя хелперы могут быть статическими и не зависеть от токена, проверим их доступность через экземпляр api.helpers)
  test("[INT-CONFIG-01] API helpers should be accessible and functional after client initialization", () => {
    const api = new TinkoffInvestApi({ token: VALID_TOKEN }); // Токен здесь может быть любым, т.к. хелперы обычно не делают запросов

    // Проверяем один из хелперов
    const number = 250.75;
    const expectedQuotation = { units: 250, nano: 750000000 };

    // Если хелперы статичные и импортированы как `Helpers`
    // expect(Helpers.toQuotation(number)).toEqual(expectedQuotation);

    // Если хелперы доступны через экземпляр `api.helpers`
    // (README показывает `api.helpers.fromTo` и `api.helpers.toQuotation`)
    expect(api.helpers).toBeDefined();
    expect(typeof api.helpers.toQuotation).toBe("function");
    expect(api.helpers.toQuotation(number)).toEqual(expectedQuotation);
  });
});
