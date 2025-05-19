// k6_real_api_loadtest.js
import http from "k6/http";
import { sleep, check, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// --- Конфигурация Метрик ---
// Общие метрики для HTTP запросов (k6 собирает их автоматически, но мы можем определить пороги)
// Кастомные метрики для каждого типа запроса
let getLastPricesDuration = new Trend("get_last_prices_duration_ms");
let getLastPricesFailRate = new Rate("get_last_prices_fail_rate");
let getLastPricesSuccessRate = new Rate("get_last_prices_success_rate");

let getCandlesDuration = new Trend("get_candles_duration_ms");
let getCandlesFailRate = new Rate("get_candles_fail_rate");
let getCandlesSuccessRate = new Rate("get_candles_success_rate");

let http429Errors = new Counter("http_429_errors_total"); // Общий счетчик ошибок 429

// --- Конфигурация Теста (Опции k6) ---
export let options = {
  stages: [
    { duration: "30s", target: 3 }, // Плавный старт до 3 VU (очень низкая нагрузка для начала)
    { duration: "1m", target: 3 }, // Держим 3 VU 1 минуту
    { duration: "30s", target: 7 }, // Увеличиваем до 7 VU
    { duration: "2m", target: 7 }, // Держим 7 VU 2 минуты
    // { duration: '30s', target: 15 },  // Опционально: следующий шаг, если предыдущие стабильны
    // { duration: '2m', target: 15 },   //
    { duration: "30s", target: 0 }, // Плавное снижение нагрузки
  ],
  thresholds: {
    // Общие HTTP метрики
    http_req_duration: ["p(95)<1500"], // 95% всех HTTP запросов < 1.5 сек (увеличил из-за реального API)
    http_req_failed: ["rate<0.02"], // Глобальная частота ошибок HTTP < 2%

    // Метрики для GetLastPrices
    get_last_prices_duration_ms: ["p(95)<1200"], // 95% запросов getLastPrices < 1.2 сек
    get_last_prices_fail_rate: ["rate<0.03"], // Частота ошибок для getLastPrices < 3%

    // Метрики для GetCandles
    get_candles_duration_ms: ["p(95)<1800"], // 95% запросов getCandles < 1.8 сек (может быть дольше)
    get_candles_fail_rate: ["rate<0.03"], // Частота ошибок для getCandles < 3%

    // Ошибки лимитов API
    http_429_errors_total: ["count<20"], // Не более 20 ошибок 429 за весь тест (подбирается экспериментально)
  },
  // Для отладки можно начать с 1 VU и короткой длительности:
  // vus: 1,
  // duration: '30s',
};

// --- Данные для Теста ---
const BASE_URL = "http://localhost:3001";
const commonFigis = [
  "BBG004730N88", // SBER
  "BBG004731354", // GAZP
  "BBG004731489", // LKOH
  "BBG000N9MNX3", // YNDX
  "USD000UTSTOM", // Доллар США TOM
];
const figisForLastPricesQuery = commonFigis.slice(0, 4).join(","); // Берем первые 4 для getLastPrices

// --- Логика Виртуального Пользователя (VU) ---
export default function () {
  // Случайный выбор операции для каждого VU в каждой итерации
  let operationType = Math.random();

  if (operationType < 0.6) {
    // 60% вероятность вызвать GetLastPrices
    group("MarketData_GetLastPrices", function () {
      const res = http.get(
        `${BASE_URL}/last-prices?figis=${figisForLastPricesQuery}`
      );

      getLastPricesDuration.add(res.timings.duration);
      const success = check(res, {
        "GetLastPrices: status is 200": (r) => r.status === 200,
        "GetLastPrices: response is array": (r) => Array.isArray(r.json()),
      });

      if (success) {
        getLastPricesSuccessRate.add(1);
        getLastPricesFailRate.add(0);
      } else {
        getLastPricesSuccessRate.add(0);
        getLastPricesFailRate.add(1);
        console.error(
          `GetLastPrices FAIL: VU=${__VU} ITER=${__ITER} Status=${res.status} Body=${res.body}`
        );
      }
      if (res.status === 429) {
        http429Errors.add(1);
      }
    });
  } else {
    // 40% вероятность вызвать GetCandles
    group("MarketData_GetCandles", function () {
      const randomFigi =
        commonFigis[Math.floor(Math.random() * commonFigis.length)];
      // Параметры для свечей: дневные свечи за последние 7 дней
      const candleInterval = "day"; // '1min', '5min', '15min', 'hour', 'day'
      const candleDays = "7";

      const res = http.get(
        `${BASE_URL}/candles?figi=${randomFigi}&interval=${candleInterval}&days=${candleDays}`
      );

      getCandlesDuration.add(res.timings.duration);
      const success = check(res, {
        "GetCandles: status is 200": (r) => r.status === 200,
        "GetCandles: response is array": (r) => Array.isArray(r.json()),
      });

      if (success) {
        getCandlesSuccessRate.add(1);
        getCandlesFailRate.add(0);
      } else {
        getCandlesSuccessRate.add(0);
        getCandlesFailRate.add(1);
        console.error(
          `GetCandles FAIL: VU=${__VU} ITER=${__ITER} Status=${res.status} Body=${res.body}`
        );
      }
      if (res.status === 429) {
        http429Errors.add(1);
      }
    });
  }

  sleep(Math.random() * 2 + 1); // Пауза между итерациями VU: 1-3 секунды
}
