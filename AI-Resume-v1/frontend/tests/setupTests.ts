// 全局测试初始化，提供 JSDOM 环境下的 polyfill 与断言扩展
import "@testing-library/jest-dom/vitest";
import "whatwg-fetch";

// 中文注释：保证 localStorage 可用且具备 clear 等方法，避免 jsdom/参数缺失报错
const ensureLocalStorage = () => {
  const hasLocalStorage = typeof global.localStorage !== "undefined";
  if (hasLocalStorage && typeof global.localStorage.clear === "function") return;

  // @ts-expect-error jsdom 环境手动注入
  const store: Record<string, string> = {};
  // @ts-expect-error 重写为可控的 mock
  global.localStorage = {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
};

ensureLocalStorage();
