// jest.config.js
module.exports = {
  testEnvironment: "node", // Среда выполнения тестов
  transform: {
    "^.+\\.js$": "babel-jest", // Использовать babel-jest для всех .js файлов
  },
  moduleFileExtensions: ["js", "json", "node"], // Расширения файлов, которые Jest будет искать
  testMatch: [
    // Паттерны для поиска тестовых файлов
    "**/tests/unit/**/*.test.js",
    "**/tests/integration/**/*.test.js",
    "**/tests/non-functional/**/*.test.js",
    // или более общий вариант, если хотите другую структуру:
    // '**/__tests__/**/*.js?(x)',
    // '**/?(*.)+(spec|test).js?(x)'
  ],
  // Если SDK tinkoff-invest-api использует ES Modules и не транспилируется jest по умолчанию:
  // (это может понадобиться, если вы получаете ошибки SyntaxError: Cannot use import statement outside a module
  // изнутри node_modules/tinkoff-invest-api)
  transformIgnorePatterns: [
    // По умолчанию Jest не транспилирует node_modules. Если SDK требует транспиляции:
    // '/node_modules/(?!tinkoff-invest-api)/', // Заставить Babel транспилировать tinkoff-invest-api
    // Однако, это часто не требуется, если SDK сам по себе уже скомпилирован в CommonJS или имеет правильные настройки для ESM
    // Чаще всего достаточно указать "type": "module" в package.json или использовать флаги Node.js для ESM.
    // Для большинства случаев стандартного transformIgnorePatterns ('/node_modules/') должно быть достаточно.
  ],
  // Для лучшей поддержки ESM с Jest (особенно если ваш проект сам по себе ESM)
  // возможно, потребуется установить "type": "module" в вашем package.json
  // и/или использовать экспериментальные флаги Node.js (но babel-jest часто решает эту проблему для тестовых файлов).
};
