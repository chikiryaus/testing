// marketdata_server.js
const express = require("express");
const { TinkoffInvestApi } = require("tinkoff-invest-api"); // Убедитесь, что SDK установлен

const app = express();
const port = 3001; // Другой порт, чтобы не конфликтовать с предыдущим сервером, если он есть

// !!! Используйте переменную окружения для токена !!!
const token = process.env.TINKOFF_API_TOKEN;
if (!token) {
  console.error("FATAL: TINKOFF_API_TOKEN environment variable is not set.");
  process.exit(1);
}

const api = new TinkoffInvestApi({ token });

// marketdata_server.js

// ... (начало файла, express, token, api - без изменений) ...

app.get("/last-prices", async (req, res) => {
  const figiQuery = req.query.figis;
  if (!figiQuery) {
    return res
      .status(400)
      .json({ error: 'Query parameter "figis" is required.' });
  }

  // Получаем массив FIGI из строки запроса
  const figiArray = figiQuery
    .split(",")
    .map((f) => f.trim())
    .filter((f) => f !== "");

  if (figiArray.length === 0) {
    console.log("No valid FIGIs provided after filtering.");
    return res.status(400).json({ error: "No valid FIGIs provided." });
  }

  console.log("Processed FIGI array:", figiArray);

  try {
    // Формируем payload для SDK, передавая и figi, и instrumentId,
    // где instrumentId будет равен figi для каждого элемента.
    // Важно: getLastPrices ожидает массив строк для figi и/или instrumentId,
    // а не массив объектов, как для некоторых других методов (например, подписки на стримы).
    // Поэтому мы передаем два отдельных массива.

    const requestPayload = {
      figi: figiArray,
      // Попробуем также передать instrumentId, дублируя значения из figiArray.
      // Это основано на наблюдении из примера getCandles и ошибке,
      // которая упоминает instrumentId.
      instrumentId: figiArray,
    };

    // Если API ожидает только ОДИН из этих параметров, то передача обоих может быть избыточной
    // или даже неверной. Но учитывая ошибку, стоит проверить этот вариант.
    // Альтернативно, если ошибка строго про 'message.instrumentId is not iterable' при передаче только 'figi',
    // возможно, SDK некорректно обрабатывает случай, когда 'instrumentId' не предоставлен явно вместе с 'figi'.

    // Сначала попробуем, как было задумано по документации (только figi):
    // const requestPayloadJustFigi = {
    //     figi: figiArray,
    // };
    // console.log(`Requesting last prices with payload (just figi):`, JSON.stringify(requestPayloadJustFigi));
    // const { lastPrices } = await api.marketdata.getLastPrices(requestPayloadJustFigi);

    // Если вариант выше все еще дает ошибку "message.instrumentId is not iterable",
    // тогда пробуем вариант с передачей обоих полей:
    console.log(
      `Requesting last prices with payload (figi & instrumentId):`,
      JSON.stringify(requestPayload)
    );
    const { lastPrices } = await api.marketdata.getLastPrices(requestPayload);

    if (!Array.isArray(lastPrices)) {
      console.error("Unexpected response format for lastPrices:", lastPrices);
      return res
        .status(500)
        .json({
          error: "Internal server error: Unexpected API response format",
        });
    }

    res.json(lastPrices);
  } catch (error) {
    console.error(
      `Error fetching last prices for FIGIs [${figiArray.join(", ")}]:`,
      error.message,
      error.details,
      error.code || ""
    );
    const statusCode =
      error.code === 7 || error.code === 16
        ? 401
        : error.code === 8
        ? 429
        : error.code === 13
        ? 500 // INTERNAL
        : error.code === 5
        ? 404
        : error.code === 3
        ? 400 // INVALID_ARGUMENT
        : 500;
    res.status(statusCode).json({
      error: error.message,
      details: error.details,
      code: error.code,
    });
  }
});

// Адаптируем эндпоинт /candles, следуя примеру из README
app.get("/candles", async (req, res) => {
  const { figi, interval, days } = req.query;

  if (!figi || !interval || !days) {
    return res
      .status(400)
      .json({
        error: 'Query parameters "figi", "interval", and "days" are required.',
      });
  }

  let candleIntervalVal;
  // Предполагаем, что CandleInterval импортирован или доступен, как в примере README
  // import { CandleInterval } from 'tinkoff-invest-api/dist/generated/marketdata.js';
  // Если нет, то используем числовые значения, как раньше
  switch (interval.toLowerCase()) {
    // Пример для CandleInterval (значения могут отличаться, сверьтесь с SDK)
    case "1min":
      candleIntervalVal = 1;
      /* CandleInterval.CANDLE_INTERVAL_1_MIN */ break;
    case "5min":
      candleIntervalVal = 2;
      /* CandleInterval.CANDLE_INTERVAL_5_MIN */ break;
    case "15min":
      candleIntervalVal = 3;
      /* CandleInterval.CANDLE_INTERVAL_15_MIN */ break;
    case "hour":
      candleIntervalVal = 4;
      /* CandleInterval.CANDLE_INTERVAL_HOUR */ break;
    case "day":
      candleIntervalVal = 5;
      /* CandleInterval.CANDLE_INTERVAL_DAY */ break;
    default:
      return res
        .status(400)
        .json({ error: "Invalid interval. Use 1min, 5min, 15min, hour, day." });
  }

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - parseInt(days, 10));

  try {
    const trimmedFigi = figi.trim();
    const requestPayload = {
      figi: trimmedFigi,
      instrumentId: trimmedFigi, // <--- Добавляем instrumentId, как в примере из README
      interval: candleIntervalVal,
      from: from,
      to: to,
    };

    console.log(
      `Requesting candles with payload:`,
      JSON.stringify(requestPayload)
    );
    // Если у вас есть хелпер api.helpers.fromTo, можно использовать его:
    // const { candles } = await api.marketdata.getCandles({
    //     figi: trimmedFigi,
    //     instrumentId: trimmedFigi,
    //     interval: candleIntervalVal,
    //     ...api.helpers.fromTo(`-${parseInt(days,10)}d`) // Пример использования хелпера
    // });
    const { candles } = await api.marketdata.getCandles(requestPayload);

    res.json(candles);
  } catch (error) {
    console.error(
      `Error fetching candles for FIGI [${figi}]:`,
      error.message,
      error.details,
      error.code || ""
    );
    const statusCode =
      error.code === 8
        ? 429
        : error.code === 13
        ? 500
        : error.code === 3
        ? 400
        : 500;
    res.status(statusCode).json({
      error: error.message,
      details: error.details,
      code: error.code,
    });
  }
});

// ... (app.listen без изменений) ...
app.listen(port, () => {
  console.log(`MarketData SDK test server listening on port ${port}`);
  console.log(
    `Using token: ${token.substring(0, 5)}...${token.substring(
      token.length - 5
    )}`
  );
});
