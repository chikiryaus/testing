// explorer.js

// Основной класс SDK
import { TinkoffInvestApi, Helpers } from "tinkoff-invest-api";

// Типы и Enum'ы из их фактического местоположения
import { CandleInterval } from "tinkoff-invest-api/dist/generated/marketdata.js";
import { InstrumentIdType } from "tinkoff-invest-api/dist/generated/instruments.js";
// Если понадобятся другие, например, для статусов инструментов:
// import { InstrumentStatus } from "tinkoff-invest-api/dist/generated/instruments.js";

const token = process.env.TINKOFF_API_TOKEN;

if (!token) {
  console.error("FATAL: TINKOFF_API_TOKEN environment variable is not set.");
  process.exit(1);
}

const api = new TinkoffInvestApi({ token });

// --- Области исследования ---

// 1. MarketDataService
async function exploreMarketData() {
  console.log("\n--- Exploring MarketDataService ---");

  const sberFigi = "BBG004730N88";
  const futuresFigi = "FUTSI0924"; // Проверьте актуальность этого FIGI для фьючерса
  const usdFigi = "USD000UTSTOM";
  const nonExistentFigi = "BBG000000000"; // Заведомо не существующий
  const anotherValidFigi = "BBG004731354"; // GAZP для примера

  // getLastPrices
  console.log("\n** getLastPrices **");
  try {
    console.log(`getLastPrices for SBER (${sberFigi}):`);
    console.log(
      await api.marketdata.getLastPrices({
        figi: [sberFigi],
        instrumentId: [sberFigi],
      })
    );
  } catch (e) {
    console.error(`Error getLastPrices SBER:`, e.message, e.code, e.details);
  }

  try {
    console.log(`getLastPrices for SBER, USD (${sberFigi}, ${usdFigi}):`);
    console.log(
      await api.marketdata.getLastPrices({
        figi: [sberFigi, usdFigi],
        instrumentId: [sberFigi, usdFigi],
      })
    );
  } catch (e) {
    console.error(
      `Error getLastPrices SBER, USD:`,
      e.message,
      e.code,
      e.details
    );
  }

  // ET-BUG-001: getLastPrices с пустым массивом figi
  try {
    console.log(
      "getLastPrices with empty figi/instrumentId array (ET-BUG-001):"
    );
    console.log(
      await api.marketdata.getLastPrices({ figi: [], instrumentId: [] })
    );
  } catch (e) {
    console.error(
      "Error getLastPrices empty arrays (ET-BUG-001):",
      e.message,
      e.code,
      e.details
    );
  }

  try {
    console.log(`getLastPrices for non-existent FIGI (${nonExistentFigi}):`);
    console.log(
      await api.marketdata.getLastPrices({
        figi: [nonExistentFigi],
        instrumentId: [nonExistentFigi],
      })
    );
  } catch (e) {
    console.error(
      `Error getLastPrices non-existent FIGI:`,
      e.message,
      e.code,
      e.details
    );
  }

  // ET-IMP-002: getLastPrices для фьючерса
  try {
    console.log(`getLastPrices for Futures (${futuresFigi}) (ET-IMP-002):`);
    console.log(
      await api.marketdata.getLastPrices({
        figi: [futuresFigi],
        instrumentId: [futuresFigi],
      })
    );
  } catch (e) {
    console.error(
      `Error getLastPrices for Futures ${futuresFigi} (ET-IMP-002):`,
      e.message,
      e.code,
      e.details
    );
  }

  // getCandles
  console.log("\n** getCandles **");
  const to = new Date();
  const from = new Date(to.getTime() - 24 * 60 * 60 * 1000 * 2); // За последние 2 суток, чтобы было больше данных

  try {
    console.log(`getCandles for SBER (${sberFigi}) (2 days, interval DAY):`);
    console.log(
      await api.marketdata.getCandles({
        figi: sberFigi,
        instrumentId: sberFigi,
        interval: CandleInterval.CANDLE_INTERVAL_DAY,
        from,
        to,
      })
    );
  } catch (e) {
    console.error(`Error getCandles SBER DAY:`, e.message, e.code, e.details);
  }

  try {
    const from1Min = new Date(to.getTime() - 10 * 60 * 1000); // За последние 10 минут
    console.log(`getCandles for SBER (${sberFigi}) (10 mins, interval 1_MIN):`);
    console.log(
      await api.marketdata.getCandles({
        figi: sberFigi,
        instrumentId: sberFigi,
        interval: CandleInterval.CANDLE_INTERVAL_1_MIN,
        from: from1Min,
        to,
      })
    );
  } catch (e) {
    console.error(`Error getCandles SBER 1_MIN:`, e.message, e.code, e.details);
  }

  // getTradingStatus
  console.log("\n** getTradingStatus **");
  try {
    console.log(`getTradingStatus for SBER (${sberFigi}):`);
    console.log(
      await api.marketdata.getTradingStatus({
        figi: sberFigi,
        instrumentId: sberFigi,
      })
    );
  } catch (e) {
    console.error(`Error getTradingStatus SBER:`, e.message, e.code, e.details);
  }
  try {
    console.log(`getTradingStatus for Futures (${futuresFigi}) (ET-IMP-002):`);
    console.log(
      await api.marketdata.getTradingStatus({
        figi: futuresFigi,
        instrumentId: futuresFigi,
      })
    );
  } catch (e) {
    console.error(
      `Error getTradingStatus ${futuresFigi} (ET-IMP-002):`,
      e.message,
      e.code,
      e.details
    );
  }
}

// 2. InstrumentsService
async function exploreInstruments() {
  console.log("\n--- Exploring InstrumentsService ---");
  const sberFigi = "BBG004730N88";
  const sberTicker = "SBER";
  const nonExistentFigi = "BBG000000000";
  const nonExistentTicker = "XXXXYYYYZZZZ";
  const tqbrClassCode = "TQBR";

  console.log("\n** getInstrumentBy (FIGI) **");
  try {
    console.log(`getInstrumentBy FIGI ${sberFigi}:`);
    console.log(
      await api.instruments.getInstrumentBy({
        idType: InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
        id: sberFigi,
      })
    );
  } catch (e) {
    console.error(
      `Error getInstrumentBy FIGI ${sberFigi}:`,
      e.message,
      e.code,
      e.details
    );
  }

  try {
    console.log(`getInstrumentBy FIGI ${nonExistentFigi} (non-existent):`);
    console.log(
      await api.instruments.getInstrumentBy({
        idType: InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
        id: nonExistentFigi,
      })
    );
  } catch (e) {
    console.error(
      `Error getInstrumentBy FIGI ${nonExistentFigi}:`,
      e.message,
      e.code,
      e.details
    );
  }

  console.log("\n** shareBy (Ticker) **");
  try {
    console.log(`shareBy Ticker ${sberTicker}, classCode ${tqbrClassCode}:`);
    console.log(
      await api.instruments.shareBy({
        idType: InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER,
        classCode: tqbrClassCode,
        id: sberTicker,
      })
    );
  } catch (e) {
    console.error(
      `Error shareBy Ticker ${sberTicker}:`,
      e.message,
      e.code,
      e.details
    );
  }

  // ET-UX-002
  try {
    console.log(
      `shareBy Ticker ${nonExistentTicker}, classCode ${tqbrClassCode} (ET-UX-002):`
    );
    console.log(
      await api.instruments.shareBy({
        idType: InstrumentIdType.INSTRUMENT_ID_TYPE_TICKER,
        classCode: tqbrClassCode,
        id: nonExistentTicker,
      })
    );
  } catch (e) {
    console.error(
      `Error shareBy Ticker ${nonExistentTicker} (ET-UX-002):`,
      e.message,
      e.code,
      e.details
    );
  }

  console.log("\n** getShares (listing) **");
  try {
    // Используйте InstrumentStatus если импортирован, или числовое значение
    // const { instruments } = await api.instruments.shares({ instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE });
    const { instruments } = await api.instruments.shares({
      instrumentStatus: 1,
    });
    console.log(
      `Got ${instruments.length} shares. First 3:`,
      instruments
        .slice(0, 3)
        .map((i) => ({ name: i.name, figi: i.figi, ticker: i.ticker }))
    );
  } catch (e) {
    console.error("Error getShares:", e.message, e.code, e.details);
  }

  console.log("\n** getFutures (listing) **"); // ET-IMP-002
  try {
    // const { instruments } = await api.instruments.futures({ instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE });
    const { instruments } = await api.instruments.futures({
      instrumentStatus: 1,
    });
    console.log(
      `Got ${instruments.length} futures. First 3:`,
      instruments
        .slice(0, 3)
        .map((i) => ({ name: i.name, figi: i.figi, ticker: i.ticker }))
    );
  } catch (e) {
    console.error(
      "Error getFutures (ET-IMP-002):",
      e.message,
      e.code,
      e.details
    );
  }
}

// 3. Хелперы (оставляем как было, так как вы предоставили вывод для этой части)
async function exploreHelpers() {
  console.log("\n--- Exploring Helpers ---");

  console.log("\n** Helpers.toQuotation (статический вызов) **");
  try {
    console.log("toQuotation(123.45):", Helpers.toQuotation(123.45));
    console.log("toQuotation(0.05):", Helpers.toQuotation(0.05));
  } catch (e) {
    console.error(
      "Error calling static Helpers.toQuotation. Check import.",
      e.message
    );
    // ... (альтернатива через api.helpers)
  }

  console.log(
    "\n** Helpers.toMoneyValue / Helpers.toNumber (статический вызов) **"
  );
  try {
    const mv = Helpers.toMoneyValue(123.45, "RUB");
    console.log('Helpers.toMoneyValue(123.45, "RUB"):', mv);
    console.log("Helpers.toNumber(mv):", Helpers.toNumber(mv));

    console.log(
      'Helpers.toNumber({ units: 10, nano: undefined, currency: "RUB" }) (ET-BUG-002):'
    );
    console.log(
      Helpers.toNumber({ units: 10, nano: undefined, currency: "RUB" })
    );
    console.log("Helpers.toNumber(null) (ET-BUG-002):");
    console.log(Helpers.toNumber(null));
  } catch (e) {
    console.error(
      "Error with static Helpers.toMoneyValue/toNumber (ET-BUG-002):",
      e.message
    );
    // ... (альтернатива через api.helpers)
  }

  console.log(
    "\n** api.helpers.fromTo (через экземпляр api - это должно работать) **"
  );
  console.log("fromTo('-5m'):", api.helpers.fromTo("-5m"));
  console.log("fromTo('-1d'):", api.helpers.fromTo("-1d"));
  const specificDate = new Date(2023, 0, 15);
  console.log(
    "fromTo('2h', specificDate):",
    api.helpers.fromTo("2h", specificDate)
  );
}

// 4. UsersService и OperationsService (оставляем как было)
async function exploreUserAndPortfolio() {
  console.log("\n--- Exploring Users & Operations Services ---");
  try {
    const { accounts } = await api.users.getAccounts({});
    console.log(
      `Found ${accounts.length} accounts. First account ID:`,
      accounts[0]?.id
    );
    if (accounts.length > 0 && accounts[0]?.id) {
      const portfolio = await api.operations.getPortfolio({
        accountId: accounts[0].id,
      });
      console.log(
        `Portfolio for account ${accounts[0].id}. Total shares:`,
        portfolio.totalAmountShares?.units,
        portfolio.totalAmountCurrencies?.units
      );
    } else if (accounts.length > 0) {
      console.log("First account has no ID or is undefined.");
    }
  } catch (e) {
    console.error(
      "Error in exploreUserAndPortfolio:",
      e.message,
      e.code,
      e.details
    );
  }
}

async function mainExplorer() {
  console.log("Starting SDK exploration...");
  console.log(
    `Using token: ${token.substring(0, 5)}...${token.substring(
      token.length - 5
    )}\n`
  );

  await exploreMarketData();
  await exploreInstruments();
  await exploreHelpers(); // Эта часть уже давала вывод, так что Helpers импортируются статически корректно
  await exploreUserAndPortfolio();

  console.log("\nSDK exploration finished.");
}

mainExplorer().catch((err) => {
  console.error("Unhandled error in mainExplorer:", err);
});
