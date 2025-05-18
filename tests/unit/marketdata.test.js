import { TinkoffInvestApi } from "tinkoff-invest-api";
// Предполагаемые пути к enum, проверьте их в вашем SDK
import { CandleInterval } from "tinkoff-invest-api/dist/generated/marketdata.js";
import { InstrumentIdType } from "tinkoff-invest-api/dist/generated/instruments.js"; // Для shareBy

describe("MarketData & Instruments Services Unit Tests (via TinkoffInvestApi)", () => {
  let api;
  let getCandlesSpy;
  let shareBySpy; // для getInstrumentByFigi (TC-MD-01, TC-MD-03)

  const VALID_FIGI_SBER = "BBG004730N88"; // SBER
  const VALID_FIGI_TCSG = "BBG00QPYJ5H0"; // Tinkoff
  const INVALID_FIGI = "INVALID_FIGI_XYZ123";

  beforeEach(() => {
    api = new TinkoffInvestApi({ token: "mock-token-unit-md" });
    getCandlesSpy = jest.spyOn(api.marketdata, "getCandles");
    // Предполагаем, что для акций используется метод shareBy из InstrumentsService
    // В SDK это может быть api.instruments.shareBy({ idType: InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI, id: FIGI })
    shareBySpy = jest.spyOn(api.instruments, "shareBy");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // TC-MD-01: Получение информации об инструменте по FIGI
  test("TC-MD-01: shareBy (for instrument) should return instrument details for a valid FIGI", async () => {
    const mockInstrumentResponse = {
      instrument: {
        figi: VALID_FIGI_SBER,
        ticker: "SBER",
        classCode: "TQBR",
        isin: "RU0009029540",
        lot: 10,
        currency: "rub",
        name: "Сбербанк России ПАО ао",
        instrumentType: "share", // это поле может называться по-другому или отсутствовать в этом методе
      },
    };
    shareBySpy.mockResolvedValue(mockInstrumentResponse);

    const instrumentInfo = await api.instruments.shareBy({
      idType: InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
      // classCode: 'TQBR', // classCode может быть необязательным или выводиться иначе
      id: VALID_FIGI_SBER,
    });

    expect(shareBySpy).toHaveBeenCalledWith({
      idType: InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
      id: VALID_FIGI_SBER,
    });
    expect(instrumentInfo).toEqual(mockInstrumentResponse);
    expect(instrumentInfo.instrument.ticker).toBe("SBER");
  });

  // TC-MD-03: Попытка получения инструмента по невалидному FIGI
  test("TC-MD-03: shareBy (for instrument) should throw error for an invalid FIGI", async () => {
    const errorMessage = "Error: 50005, Instrument not found."; // Пример ошибки
    shareBySpy.mockRejectedValue(new Error(errorMessage));

    await expect(
      api.instruments.shareBy({
        idType: InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
        id: INVALID_FIGI,
      })
    ).rejects.toThrow(errorMessage);
  });

  // TC-MD-02: Получение 1-минутных свечей за последние 5 минут
  test("TC-MD-02: getCandles should return candles data", async () => {
    const mockCandlesResponse = {
      candles: [
        {
          open: { units: 100, nano: 0 },
          high: { units: 101, nano: 0 },
          low: { units: 99, nano: 0 },
          close: { units: 100, nano: 500000000 },
          time: new Date(Date.now() - 60000 * 2).toISOString(),
          volume: "1000",
          isComplete: true,
        },
        {
          open: { units: 100, nano: 500000000 },
          high: { units: 102, nano: 0 },
          low: { units: 100, nano: 0 },
          close: { units: 101, nano: 0 },
          time: new Date(Date.now() - 60000 * 1).toISOString(),
          volume: "1200",
          isComplete: true,
        },
      ],
    };
    getCandlesSpy.mockResolvedValue(mockCandlesResponse);

    // Определяем временной интервал: from = (текущее время - 5 минут), to = (текущее время).
    // Вместо хелпера api.helpers.fromTo в unit-тесте лучше явно задать даты,
    // чтобы тест был более детерминированным и не зависел от реализации хелпера.
    const to = new Date();
    const from = new Date(to.getTime() - 5 * 60 * 1000);

    const candlesData = await api.marketdata.getCandles({
      figi: VALID_FIGI_TCSG,
      instrumentId: VALID_FIGI_TCSG, // или uid, если отличается
      interval: CandleInterval.CANDLE_INTERVAL_1_MIN,
      from: from,
      to: to,
    });

    expect(getCandlesSpy).toHaveBeenCalledTimes(1);
    expect(getCandlesSpy).toHaveBeenCalledWith({
      figi: VALID_FIGI_TCSG,
      instrumentId: VALID_FIGI_TCSG,
      interval: CandleInterval.CANDLE_INTERVAL_1_MIN,
      from: from,
      to: to,
    });
    expect(candlesData).toEqual(mockCandlesResponse);
    expect(candlesData.candles).toHaveLength(2);
  });
});
