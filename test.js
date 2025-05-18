import { TinkoffInvestApi } from "tinkoff-invest-api";
import { InstrumentType } from "tinkoff-invest-api/dist/generated/common.js";
import { InstrumentIdType } from "tinkoff-invest-api/dist/generated/instruments.js";
//import { InstrumentIdType } from 'tinkoff-invest-api/dist/generated/instruments.js';

const user_token =
  "t.fw7iTurYbenwWQp049ocrLNghDNN1I8R6Gf2Mvvz-6C4fWeFE6IM29_mV2jVw0vaSyVGJB-jJ6ls6HAP46awDw";

const api = new TinkoffInvestApi({ token: user_token });
//let figi = "MTLR";
let figi = "BBG004S68598";

const instrumentDetails = await api.instruments.getInstrumentBy({
  idType: InstrumentIdType.INSTRUMENT_ID_TYPE_FIGI,
  classCode: "",
  id: figi,
  // classCode не нужен для FIGI
});

// const instrumentDetails = await api.instruments.findInstrument({
//     query: "BBG004S68598",
//     instrument_kind: InstrumentType.INSTRUMENT_TYPE_SHARE
// })
console.log(instrumentDetails);
