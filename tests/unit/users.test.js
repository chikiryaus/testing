import { TinkoffInvestApi } from "tinkoff-invest-api";

describe("UsersService Unit Tests (via TinkoffInvestApi)", () => {
  let api;
  let getAccountsSpy;

  beforeEach(() => {
    // Создаем экземпляр API перед каждым тестом
    // Токен здесь не важен для unit-теста метода, т.к. сам вызов будет замокан
    api = new TinkoffInvestApi({ token: "mock-token-unit-user" });
    // Шпионим за методом getAccounts сервиса users
    getAccountsSpy = jest.spyOn(api.users, "getAccounts");
  });

  afterEach(() => {
    // Очищаем всех шпионов после каждого теста
    jest.restoreAllMocks();
  });

  // TC-ACC-01: Получение списка счетов пользователя (успешный сценарий)
  test("TC-ACC-01: getAccounts should return user accounts on success", async () => {
    const mockAccountsResponse = {
      accounts: [
        {
          id: "acc123",
          name: "Broker Account",
          type: 2,
          status: 1,
          openedDate: new Date().toISOString(),
          accessLevel: 1,
        },
        {
          id: "acc456",
          name: "IIS Account",
          type: 3,
          status: 1,
          openedDate: new Date().toISOString(),
          accessLevel: 1,
        },
      ],
    };
    getAccountsSpy.mockResolvedValue(mockAccountsResponse); // Мокаем успешный ответ

    const result = await api.users.getAccounts({});

    expect(getAccountsSpy).toHaveBeenCalledTimes(1);
    expect(getAccountsSpy).toHaveBeenCalledWith({});
    expect(result).toEqual(mockAccountsResponse);
    expect(result.accounts).toHaveLength(2);
    expect(result.accounts[0].id).toBe("acc123");
  });

  test("getAccounts should handle API errors gracefully", async () => {
    const mockError = new Error("API Error: Failed to fetch accounts");
    getAccountsSpy.mockRejectedValue(mockError); // Мокаем ошибку

    await expect(api.users.getAccounts({})).rejects.toThrow(
      "API Error: Failed to fetch accounts"
    );
    expect(getAccountsSpy).toHaveBeenCalledTimes(1);
  });
});
