// tests/non-functional/sdk.behavior.test.js

import { TinkoffInvestApi, Helpers } from "tinkoff-invest-api";
// Импорты для конкретных операций, если нужны
// import { GetAccountsRequest } from 'tinkoff-invest-api/dist/generated/users.js'; // Пример
// import { CandleInterval } from 'tinkoff-invest-api/dist/generated/marketdata.js'; // Пример

describe("Non-Functional Tests for Tinkoff Invest API SDK", () => {
  // --- Тесты производительности ---

  // NFT-PERF-01
  test("[NFT-PERF-01] SDK client should initialize within an acceptable time (e.g., < 50ms)", () => {
    const startTime = performance.now();
    new TinkoffInvestApi({ token: "test-token-perf" });
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`NFT-PERF-01 Initialization time: ${duration}ms`);
    expect(duration).toBeLessThan(50); // Порог можно настроить
  });

  // NFT-PERF-02
  // Идея: Слишком строгий порог для выполнения 1000 мокированных вызовов.
  // Мы симулируем, что накладные расходы SDK на каждый вызов больше, чем мы "хотим".
  test("[NFT-PERF-02] SDK should handle 1000 simple (mocked) calls rapidly (e.g., < 100ms) - EXPECTED TO FAIL", async () => {
    const api = new TinkoffInvestApi({ token: "test-token-perf" });
    // Мокаем очень простой метод, чтобы минимизировать влияние самого мока
    const getAccountsSpy = jest
      .spyOn(api.users, "getAccounts")
      .mockResolvedValue({ accounts: [] });

    const startTime = performance.now();
    for (let i = 0; i < 1000; i++) {
      await api.users.getAccounts({});
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    console.log(`NFT-PERF-02 Time for 1000 mocked calls: ${duration}ms`);

    // ВОТ ЗДЕСЬ "ЛОМАЕМ" ТЕСТ: устанавливаем нереалистично низкий порог
    expect(duration).toBeLessThan(10); // Ожидаем, что это не пройдет. 1000 вызовов (даже мок) за <10мс - очень быстро.

    getAccountsSpy.mockRestore();
  });

  // --- Тесты надёжности / Устойчивости к ошибкам ---

  // NFT-RELIABILITY-01
  // Проверка, что SDK корректно выбрасывает ошибку, если мок вернул null вместо ожидаемого объекта ошибки
  test("[NFT-RELIABILITY-01] SDK should throw a typed error or a clear message if an API (mock) call unexpectedly returns null", async () => {
    const api = new TinkoffInvestApi({ token: "test-token-reliability" });
    const getPortfolioSpy = jest
      .spyOn(api.operations, "getPortfolio")
      .mockResolvedValue(null); // Мок возвращает null

    try {
      await api.operations.getPortfolio({
        accountId: "test",
        currency: 1 /* RUB */,
      });
      // Если мы здесь, значит ошибка не была выброшена, тест должен упасть
      throw new Error("Error was expected but not thrown");
    } catch (e) {
      // Ожидаем, что SDK как-то обработает этот null и выбросит свою ошибку
      // или мы проверяем сообщение об ошибке
      expect(e).toBeInstanceOf(Error);
      // Можно добавить проверку на сообщение, если SDK формирует специфическое
      // console.log(`NFT-RELIABILITY-01 Error: ${e.message}`);
      // expect(e.message).toContain('Failed to process portfolio response'); // Пример
    }
    getPortfolioSpy.mockRestore();
  });

  // NFT-RELIABILITY-02
  // Идея: Мокированный API возвращает данные в совершенно неожиданном формате (не то, что ожидает SDK).
  // Мы ожидаем, что SDK выбросит *определенную* ошибку парсинга, но он может выбросить другую или не выбросить вовсе,
  // если его внутренняя логика устойчива или по-другому обрабатывает это.
  test("[NFT-RELIABILITY-02] SDK should throw a specific parsing error for malformed API (mock) response - EXPECTED TO FAIL", async () => {
    const api = new TinkoffInvestApi({ token: "test-token-reliability" });
    const getCandlesSpy = jest
      .spyOn(api.marketdata, "getCandles")
      .mockResolvedValue({ totally_unexpected_field: [{ foo: "bar" }] }); // Неверный формат

    try {
      await api.marketdata.getCandles({
        figi: "BBG000B9XRY4",
        interval: 1,
        from: new Date(),
        to: new Date(),
      });
      throw new Error(
        "Error was expected but not thrown for malformed response"
      );
    } catch (e) {
      console.log(`NFT-RELIABILITY-02 Error for malformed: ${e.message}`);
      // "ЛОМАЕМ" ТЕСТ: Мы ожидаем очень специфическую ошибку, которой может не быть
      expect(e.message).toMatch(/MalformedCandleDataError|InvalidSchemaError/i);
    }
    getCandlesSpy.mockRestore();
  });

  // NFT-RELIABILITY-03
  // Идея: Проверка на утечку токена в сообщении об ошибке.
  // Мы "ломаем" мок так, чтобы он *включил* токен в сообщение об ошибке, а тест ожидает, что токена там НЕ будет.
  // Это покажет, что SDK (в нашей симуляции) не маскирует токен в ошибках.
  test("[NFT-RELIABILITY-03] SDK error messages should NOT contain the API token - EXPECTED TO FAIL", async () => {
    const SENSITIVE_TOKEN = "super-secret-token-12345";
    const api = new TinkoffInvestApi({ token: SENSITIVE_TOKEN });
    const getAccountsSpy = jest
      .spyOn(api.users, "getAccounts")
      // "Ломаем" мок: он возвращает ошибку, содержащую токен
      .mockRejectedValue(
        new Error(
          `API Auth Error: Invalid token provided (${SENSITIVE_TOKEN}). Please check your credentials.`
        )
      );

    try {
      await api.users.getAccounts({});
      throw new Error("Error was expected but not thrown");
    } catch (e) {
      console.log(`NFT-RELIABILITY-03 Error message: ${e.message}`);
      // Тест ожидает, что токена в сообщении НЕ будет.
      // Поскольку наш мок его содержит, этот expect НЕ выполнится, и тест упадет.
      expect(e.message).not.toContain(SENSITIVE_TOKEN);
    }
    getAccountsSpy.mockRestore();
  });

  // --- Тесты удобства использования (API Usability) ---

  // NFT-USABILITY-01
  test("[NFT-USABILITY-01] Helper Helpers.toQuotation should correctly convert number to Quotation", () => {
    const number = 123.45;
    const expectedQuotation = { units: 123, nano: 450000000 };
    const quotation = Helpers.toQuotation(number);
    expect(quotation).toEqual(expectedQuotation);
  });

  // NFT-USABILITY-02
  // Идея: Мы предполагаем, что SDK должен предоставлять очень "дружелюбное" сообщение об ошибке,
  // если обязательный параметр не передан, а он возвращает стандартное или менее информативное.
  test("[NFT-USABILITY-02] SDK should provide a very user-friendly message for missing required parameters - EXPECTED TO FAIL", async () => {
    const api = new TinkoffInvestApi({ token: "test-token-usability" });
    // Мокаем вызов, чтобы он провалился так, как будто параметр не был передан на уровень ниже (например, в gRPC)
    const postOrderSpy = jest
      .spyOn(api.orders, "postOrder")
      .mockRejectedValue(new Error('Error: Missing required field "figi"')); // Типичная ошибка от gRPC или валидатора

    try {
      // Вызываем метод без обязательного параметра figi (предполагаем, что SDK должен это поймать раньше)
      // Для чистоты эксперимента, мы ожидаем, что SDK сам сделает проверку, но мокаем ошибку нижнего уровня.
      await api.orders.postOrder({
        // figi: 'BBG000B9XRY4', // Пропускаем figi
        quantity: 1,
        price: Helpers.toQuotation(100),
        direction: 1, // ORDER_DIRECTION_BUY
        accountId: "test-acc",
        orderType: 2, // ORDER_TYPE_LIMIT
        orderId: "random-id-usability",
      });
      throw new Error("Error was expected for missing parameter");
    } catch (e) {
      console.log(`NFT-USABILITY-02 Error for missing param: ${e.message}`);
      // "ЛОМАЕМ" ТЕСТ: Ожидаем ОЧЕНЬ дружелюбное сообщение, которого, скорее всего, нет.
      const expectedUserFriendlyMessage =
        "Параметр 'figi' является обязательным для создания заявки и не был предоставлен. Пожалуйста, укажите FIGI инструмента.";
      expect(e.message).toBe(expectedUserFriendlyMessage);
    }
    postOrderSpy.mockRestore();
  });
});
