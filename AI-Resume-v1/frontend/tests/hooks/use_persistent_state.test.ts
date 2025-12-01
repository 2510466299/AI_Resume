import { renderHook, act } from "@testing-library/react";
import { usePersistentState } from "../../src/hooks/usePersistentState";

describe("usePersistentState", () => {
  beforeEach(() => {
    // 中文注释：每个用例前清理本地存储，保持初始状态一致
    localStorage.clear();
  });

  it("初始化时优先读取本地存储，解析失败回退默认值", () => {
    localStorage.setItem("k1", JSON.stringify(123));
    const { result } = renderHook(() => usePersistentState<number>("k1", 0));
    expect(result.current[0]).toBe(123);

    localStorage.setItem("k2", "{非法json");
    const { result: bad } = renderHook(() => usePersistentState<number>("k2", 5));
    expect(bad.current[0]).toBe(5);
  });

  it("状态更新会写回本地存储", () => {
    const { result } = renderHook(() => usePersistentState<number>("k3", 1));
    act(() => result.current[1](9));
    expect(JSON.parse(localStorage.getItem("k3") || "0")).toBe(9);
  });

  it("无 window 场景直接返回默认值", () => {
    const realStorage = global.window.localStorage;
    // 中文注释：模拟无 localStorage（但保留 window 以避免 React 崩溃）
    // @ts-expect-error 强制置空
    global.window.localStorage = undefined;
    const { result } = renderHook(() => usePersistentState<number>("k4", 7));
    expect(result.current[0]).toBe(7);
    global.window.localStorage = realStorage;
  });
});
