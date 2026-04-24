import { createAssistant, createSmartappDebugger } from "@salutejs/client";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./utils/cn";

type PageId = "home" | "tasks" | "music" | "focus";
type TodoFilter = "all" | "active" | "done";
type Theme = "dark" | "light";
type FocusPresetType = "work" | "break" | "custom";

type Subtask = {
  id: number;
  title: string;
  done: boolean;
};

type Todo = {
  id: number;
  title: string;
  done: boolean;
  subtasks: Subtask[];
};

type Track = {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName?: string;
  primaryGenreName?: string;
  previewUrl?: string;
};

type AssistantCommand = {
  type?: string;
  action?: {
    type?: string;
    note?: string;
    id?: string | number;
    page?: string;
    query?: string;
    minutes?: number | string;
    subtask?: string;
  };
  navigation?: {
    command?: "UP" | "DOWN" | "LEFT" | "RIGHT" | "FORWARD";
  };
  smart_app_data?: {
    type?: string;
    payload?: Record<string, unknown>;
  };
};

const PAGES: Array<{ id: PageId; label: string; subtitle: string }> = [
  { id: "home", label: "Главная", subtitle: "Обзор" },
  { id: "tasks", label: "Задачи", subtitle: "Todo" },
  { id: "music", label: "Музыка", subtitle: "Поиск треков" },
  { id: "focus", label: "Фокус", subtitle: "Таймер" },
];

const pageMeta: Record<PageId, { title: string; description: string }> = {
  home: {
    title: "Nova Voice Workspace",
    description: "Единый smartapp-интерфейс для задач, музыки и фокус-сессий.",
  },
  tasks: {
    title: "Список задач",
    description: "Планирование с подпунктами и удобным контролем прогресса.",
  },
  music: {
    title: "Музыкальный раздел",
    description: "Быстрый поиск песен и демо-режим распознавания в духе Shazam.",
  },
  focus: {
    title: "Режим фокуса",
    description: "Таймер для рабочих спринтов с простой аналитикой по сессиям.",
  },
};

const FAVORITE_QUERIES = ["Miyagi", "Imagine Dragons", "Rauf Faik", "The Weeknd"];

const normalizeEnvValue = (value: string | undefined): string => {
  if (!value) {
    return "";
  }
  return value.trim().replace(/^['\"]|['\"]$/g, "");
};

const getEnvRecord = (): Record<string, string | undefined> => {
  return (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
};

const getEnv = (key: string): string => {
  const env = getEnvRecord();
  const directValue = normalizeEnvValue(env[key]);
  if (directValue) {
    return directValue;
  }

  // Fallback for rare cases (BOM/hidden chars in env key names).
  const matchedEntry = Object.entries(env).find(([envKey]) => envKey.trim().replace(/\uFEFF/g, "") === key);
  return normalizeEnvValue(matchedEntry?.[1]);
};

const findEnvByPattern = (pattern: RegExp): string => {
  const env = getEnvRecord();
  const matchedEntry = Object.entries(env).find(([rawKey, rawValue]) => {
    const normalizedKey = rawKey.replace(/\uFEFF/g, "").trim();
    return pattern.test(normalizedKey) && Boolean(normalizeEnvValue(rawValue));
  });
  return normalizeEnvValue(matchedEntry?.[1]);
};
console.log('ENV token:', import.meta.env.VITE_SALUTE_TOKEN);
const getAssistantToken = (): string => {
  return (
    getEnv("VITE_SALUTE_TOKEN") ||
    getEnv("VITE_TOKEN") ||
    getEnv("REACT_APP_TOKEN") ||
    getEnv("REACT_APP_SALUTE_TOKEN") ||
    findEnvByPattern(/(VITE|REACT_APP).*(SALUTE)?.*TOKEN|TOKEN.*(VITE|REACT_APP|SALUTE)/i)
  );
};

const getAssistantAppName = (): string => {
  const envAppName =
    getEnv("VITE_SALUTE_SMARTAPP") ||
    getEnv("VITE_SMARTAPP") ||
    getEnv("REACT_APP_SMARTAPP") ||
    getEnv("REACT_APP_SALUTE_SMARTAPP") ||
    findEnvByPattern(/(VITE|REACT_APP).*(SMARTAPP|APP).*|SMARTAPP.*(VITE|REACT_APP)/i);
  if (envAppName) {
    return envAppName;
  }

  const params = new URLSearchParams(window.location.search);
  const queryApp = params.get("smartapp") || params.get("saluteApp");
  if (queryApp) {
    return normalizeEnvValue(queryApp);   // больше не сохраняем в localStorage
  }

  return "Canvas Voice Lab";   // fallback по умолчанию
};

const isPageId = (value: unknown): value is PageId => {
  return typeof value === "string" && PAGES.some((page) => page.id === value);
};

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const createTodoItem = (title: string): Todo => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  title,
  done: false,
  subtasks: [],
});

export default function App() {
  const [page, setPage] = useState<PageId>("home");
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem("nova-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [todoText, setTodoText] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [subtaskDrafts, setSubtaskDrafts] = useState<Record<number, string>>({});
  const [todoFilter, setTodoFilter] = useState<TodoFilter>("all");

  const [musicQuery, setMusicQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicError, setMusicError] = useState("");
  const [detectedTrack, setDetectedTrack] = useState<Track | null>(null);
  const [recognitionLoading, setRecognitionLoading] = useState(false);
  const [activePreviewTrackId, setActivePreviewTrackId] = useState<number | null>(null);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);
  const [previewVolume, setPreviewVolume] = useState(() => {
    const saved = window.localStorage.getItem("nova-preview-volume");
    if (saved === null) {
      return 0.5;
    }
    const parsed = Number(saved);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
    return 0.5;
  });

  const [focusDuration, setFocusDuration] = useState(25 * 60);
  const [focusLeft, setFocusLeft] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const [focusSessions, setFocusSessions] = useState(0);
  const [customMinutes, setCustomMinutes] = useState("25");
  const [focusPresetType, setFocusPresetType] = useState<FocusPresetType>("work");
  const [assistantUiMode, setAssistantUiMode] = useState<"none" | "debugger" | "host">("none");

  const [, setAssistantStatus] = useState("Не подключен");
  const [, setLastCommand] = useState("Ожидание событий ассистента");
  const assistantRef = useRef<any>(null);
  const assistantInitAttemptedRef = useRef(false);
  const pageRef = useRef<PageId>("home");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewRafRef = useRef<number | null>(null);
  const isDark = theme === "dark";

  const shellClass = isDark
    ? "relative min-h-screen overflow-x-hidden bg-[#05090a] text-white"
    : "relative min-h-screen overflow-x-hidden bg-[#f3f8f6] text-slate-900";

  const primaryButtonClass = cn(
    "rounded-xl transition duration-200 hover:brightness-105",
    isDark
      ? "bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 text-[#062216] hover:shadow-[0_0_0_1px_rgba(197,255,229,0.38),0_14px_34px_-16px_rgba(70,245,179,0.8)]"
      : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_14px_32px_-18px_rgba(16,185,129,0.55)]"
  );

  const ghostButtonClass = cn(
    "rounded-xl border transition duration-200",
    isDark
      ? "border-white/20 text-emerald-50 hover:border-emerald-100/80 hover:bg-emerald-200/10 hover:shadow-[0_0_0_1px_rgba(180,255,222,0.3),0_10px_30px_-18px_rgba(94,238,178,0.85)]"
      : "border-emerald-500/30 text-emerald-800 hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_10px_26px_-18px_rgba(16,185,129,0.55)]"
  );

  const filteredTodos = useMemo(() => {
    if (todoFilter === "active") {
      return todos.filter((todo) => !todo.done);
    }
    if (todoFilter === "done") {
      return todos.filter((todo) => todo.done);
    }
    return todos;
  }, [todoFilter, todos]);

  const completedCount = useMemo(() => todos.filter((todo) => todo.done).length, [todos]);
  const progress = todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  const voiceItems = useMemo(() => {
    return todos.map((todo, index) => ({
      id: String(todo.id),
      number: index + 1,
      title: todo.title,
    }));
  }, [todos]);

  const getAssistantState = useCallback(() => {
    return {
      screen: page,
      todo_count: todos.length,
      item_selector: {
        ignored_words: ["открой", "покажи", "перейди"],
        items: voiceItems,
      },
    };
  }, [page, todos.length, voiceItems]);

  const sendFrontendAction = useCallback((actionId: string, parameters?: Record<string, unknown>) => {
    if (!assistantRef.current?.sendData) {
      return;
    }

    assistantRef.current.sendData({
      action: {
        action_id: actionId,
        parameters,
      },
    });
  }, []);

  const navigateTo = useCallback((nextPage: PageId, pushHistory = true) => {
    setPage(nextPage);
    if (pushHistory) {
      window.history.pushState({ page: nextPage }, "", "");
    }
  }, []);

  const addTodo = useCallback(
    (title: string) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        return false;
      }

      const nextTodo = createTodoItem(cleanTitle);
      setTodos((prev) => [nextTodo, ...prev]);
      sendFrontendAction("add_todo", { title: cleanTitle });
      return true;
    },
    [sendFrontendAction]
  );

  const toggleTodo = useCallback(
    (id: number) => {
      setTodos((prev) => {
        return prev.map((todo) => {
          if (todo.id !== id) {
            return todo;
          }

          const nextDone = !todo.done;
          return {
            ...todo,
            done: nextDone,
            subtasks: todo.subtasks.map((subtask) => ({ ...subtask, done: nextDone })),
          };
        });
      });
      sendFrontendAction("toggle_todo", { id });
    },
    [sendFrontendAction]
  );

  const removeTodo = useCallback(
    (id: number) => {
      setTodos((prev) => prev.filter((todo) => todo.id !== id));
      setSubtaskDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      sendFrontendAction("remove_todo", { id });
    },
    [sendFrontendAction]
  );

  const toggleTodoByAssistantId = useCallback((assistantId: string) => {
    setTodos((prev) =>
      prev.map((todo) => {
        if (String(todo.id) !== assistantId) {
          return todo;
        }

        const nextDone = !todo.done;
        return {
          ...todo,
          done: nextDone,
          subtasks: todo.subtasks.map((subtask) => ({ ...subtask, done: nextDone })),
        };
      })
    );
  }, []);

  const removeTodoByAssistantId = useCallback((assistantId: string) => {
    setTodos((prev) => prev.filter((todo) => String(todo.id) !== assistantId));
    setSubtaskDrafts((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (key === assistantId) {
          delete next[Number(key)];
        }
      });
      return next;
    });
  }, []);

  const toggleTodoByAssistantTitle = useCallback((title: string) => {
    const normalizedTitle = title.trim().toLowerCase();
    if (!normalizedTitle) {
      return;
    }

    setTodos((prev) =>
      prev.map((todo) => {
        if (todo.title.trim().toLowerCase() !== normalizedTitle) {
          return todo;
        }

        const nextDone = !todo.done;
        return {
          ...todo,
          done: nextDone,
          subtasks: todo.subtasks.map((subtask) => ({ ...subtask, done: nextDone })),
        };
      })
    );
  }, []);

  const removeTodoByAssistantTitle = useCallback((title: string) => {
    const normalizedTitle = title.trim().toLowerCase();
    if (!normalizedTitle) {
      return;
    }

    setTodos((prev) => prev.filter((todo) => todo.title.trim().toLowerCase() !== normalizedTitle));
  }, []);

  const setSubtaskDraft = useCallback((todoId: number, value: string) => {
    setSubtaskDrafts((prev) => ({ ...prev, [todoId]: value }));
  }, []);

  const addSubtask = useCallback(
    (todoId: number, title: string) => {
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        return;
      }

      setTodos((prev) =>
        prev.map((todo) => {
          if (todo.id !== todoId) {
            return todo;
          }

          return {
            ...todo,
            done: false,
            subtasks: [
              ...todo.subtasks,
              { id: Date.now() + Math.floor(Math.random() * 1000), title: cleanTitle, done: false },
            ],
          };
        })
      );
      setSubtaskDraft(todoId, "");
      sendFrontendAction("add_subtask", { todo_id: todoId, title: cleanTitle });
    },
    [sendFrontendAction, setSubtaskDraft]
  );

  const toggleSubtask = useCallback(
    (todoId: number, subtaskId: number) => {
      setTodos((prev) =>
        prev.map((todo) => {
          if (todo.id !== todoId) {
            return todo;
          }

          const nextSubtasks = todo.subtasks.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
          );
          const allDone = nextSubtasks.length > 0 && nextSubtasks.every((subtask) => subtask.done);

          return {
            ...todo,
            done: allDone,
            subtasks: nextSubtasks,
          };
        })
      );
      sendFrontendAction("toggle_subtask", { todo_id: todoId, subtask_id: subtaskId });
    },
    [sendFrontendAction]
  );

  const removeSubtask = useCallback(
    (todoId: number, subtaskId: number) => {
      setTodos((prev) =>
        prev.map((todo) => {
          if (todo.id !== todoId) {
            return todo;
          }

          const nextSubtasks = todo.subtasks.filter((subtask) => subtask.id !== subtaskId);
          const allDone = nextSubtasks.length > 0 && nextSubtasks.every((subtask) => subtask.done);

          return {
            ...todo,
            done: allDone,
            subtasks: nextSubtasks,
          };
        })
      );
      sendFrontendAction("remove_subtask", { todo_id: todoId, subtask_id: subtaskId });
    },
    [sendFrontendAction]
  );

  const completeAllTodos = useCallback(() => {
    setTodos((prev) =>
      prev.map((todo) => ({
        ...todo,
        done: true,
        subtasks: todo.subtasks.map((subtask) => ({ ...subtask, done: true })),
      }))
    );
    sendFrontendAction("complete_all_todos");
  }, [sendFrontendAction]);

  const clearCompletedTodos = useCallback(() => {
    setTodos((prev) => prev.filter((todo) => !todo.done));
    sendFrontendAction("clear_completed_todos");
  }, [sendFrontendAction]);

  const searchTracks = useCallback(
    async (query: string) => {
      const cleanQuery = query.trim();
      if (!cleanQuery) {
        setTracks([]);
        return;
      }

      setMusicLoading(true);
      setMusicError("");

      try {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=12`
        );
        if (!response.ok) {
          throw new Error("Не удалось получить музыку");
        }

        const data = (await response.json()) as { results?: Track[] };
        setTracks(data.results ?? []);
        setDetectedTrack(null);
        setActivePreviewTrackId(null);
        setActivePreviewUrl(null);
        setPreviewPlaying(false);
        setPreviewCurrentTime(0);
        setPreviewDuration(0);
        sendFrontendAction("search_music", { query: cleanQuery });
      } catch {
        setMusicError("Сервис музыки временно недоступен, попробуйте позже.");
      } finally {
        setMusicLoading(false);
      }
    },
    [sendFrontendAction]
  );

  const handleMusicSubmit = (event: FormEvent) => {
    event.preventDefault();
    searchTracks(musicQuery);
  };

  const runRecognitionDemo = useCallback(async () => {
    setRecognitionLoading(true);
    setDetectedTrack(null);
    await new Promise((resolve) => window.setTimeout(resolve, 1800));

    const source = tracks.length > 0 ? tracks : [];
    if (source.length > 0) {
      const randomTrack = source[Math.floor(Math.random() * source.length)];
      setDetectedTrack(randomTrack);
      setLastCommand(`Распознано: ${randomTrack.trackName} - ${randomTrack.artistName}`);
      sendFrontendAction("music_recognition_demo", { track: randomTrack.trackName });
    } else {
      setLastCommand("Для демо-распознавания сначала выполните поиск трека");
    }

    setRecognitionLoading(false);
  }, [tracks, sendFrontendAction]);

  const runLocalCommand = useCallback(
    (rawCommand: string) => {
      const command = rawCommand.trim().toLowerCase();
      if (!command) {
        return;
      }

      if (command.includes("глав") || command.includes("домой")) {
        navigateTo("home");
        setLastCommand("Перешли на главную");
        return;
      }
      if (command.includes("задач")) {
        navigateTo("tasks");
        setLastCommand("Открыли задачи");
        return;
      }
      if (command.includes("музык")) {
        navigateTo("music");
        setLastCommand("Открыли музыку");
        return;
      }
      if (command.includes("фокус") || command.includes("таймер")) {
        navigateTo("focus");
        setLastCommand("Открыли режим фокуса");
        return;
      }
      if (command.startsWith("добавь задачу ")) {
        const title = command.replace("добавь задачу ", "");
        const created = addTodo(title);
        setLastCommand(created ? `Добавили задачу: ${title}` : "Не удалось добавить задачу");
        return;
      }

      setLastCommand(`Команда не распознана: ${rawCommand}`);
    },
    [addTodo, navigateTo]
  );

  const togglePreview = useCallback(
    async (trackId: number, previewUrl?: string) => {
      if (!previewUrl) {
        return;
      }

      if (activePreviewTrackId === trackId) {
        previewAudioRef.current?.pause();
        setPreviewPlaying(false);
        setActivePreviewTrackId(null);
        setActivePreviewUrl(null);
        return;
      }

      setActivePreviewTrackId(trackId);
      setActivePreviewUrl(previewUrl);
      setPreviewCurrentTime(0);
      setPreviewDuration(0);
      setPreviewPlaying(false);
      sendFrontendAction("music_preview_open", { id: trackId });
    },
    [activePreviewTrackId, sendFrontendAction]
  );

  const togglePlayback = useCallback(async () => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
        setPreviewPlaying(true);
      } catch {
        setPreviewPlaying(false);
      }
      return;
    }

    audio.pause();
    setPreviewPlaying(false);
  }, []);

  const seekPreview = useCallback((value: number) => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }
    audio.currentTime = value;
    setPreviewCurrentTime(value);
  }, []);

  const changePreviewVolume = useCallback((value: number) => {
    const audio = previewAudioRef.current;
    if (audio) {
      audio.volume = value;
    }
    setPreviewVolume(value);
  }, []);

  const stopPreviewProgressLoop = useCallback(() => {
    if (previewRafRef.current !== null) {
      window.cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
  }, []);

  const startPreviewProgressLoop = useCallback(() => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }

    stopPreviewProgressLoop();

    const updateProgress = () => {
      const currentAudio = previewAudioRef.current;
      if (!currentAudio || currentAudio.paused || currentAudio.ended) {
        previewRafRef.current = null;
        return;
      }

      setPreviewCurrentTime(currentAudio.currentTime || 0);
      previewRafRef.current = window.requestAnimationFrame(updateProgress);
    };

    previewRafRef.current = window.requestAnimationFrame(updateProgress);
  }, [stopPreviewProgressLoop]);

  // Handle preview source changes only; volume updates are handled in a dedicated effect below.
  useEffect(() => {
    window.history.replaceState({ page: "home" }, "", "");
    const handlePopState = (event: PopStateEvent) => {
      if (isPageId(event.state?.page)) {
        setPage(event.state.page);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    const token = getAssistantToken();
    const smartAppName = getAssistantAppName();

    if (assistantRef.current || assistantInitAttemptedRef.current) {
      return;
    }
    assistantInitAttemptedRef.current = true;

    try {
      const isDev = Boolean(
        (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env.DEV
      );
      const host = (window as Window & { AssistantHost?: { ready?: unknown } }).AssistantHost;
      const hasAssistantHost = typeof host?.ready === "function";
      const canUseDebugger = isDev && Boolean(token);

      (window as Window & { __NOVA_ASSISTANT_DEBUG__?: Record<string, unknown> }).__NOVA_ASSISTANT_DEBUG__ = {
        isDev,
        hasAssistantHost,
        canUseDebugger,
        tokenPresent: Boolean(token),
        tokenPreview: token ? `${token.slice(0, 10)}...${token.slice(-6)}` : "",
        smartAppName,
        envKeys: Object.keys(getEnvRecord()).filter((key) => key.includes("SALUTE") || key.includes("SMARTAPP")),
      };

      console.info("[Nova Assistant] init", {
        isDev,
        hasAssistantHost,
        canUseDebugger,
        tokenPresent: Boolean(token),
        smartAppName,
      });

      if (isDev && !token && !hasAssistantHost) {
        setAssistantStatus("Не подключен (нет токена в .env)");
        console.warn("[Nova Assistant] Token not found in env. Add VITE_SALUTE_TOKEN to .env and restart.");
        return;
      }

      if (!canUseDebugger && !hasAssistantHost) {
        setAssistantStatus("Веб-режим (без AssistantHost)");
        setAssistantUiMode("none");
        console.warn("[Nova Assistant] Debugger is disabled: neither dev-token nor AssistantHost is available");
        return;
      }

      assistantRef.current =
        canUseDebugger
          ? createSmartappDebugger({
              token,
              // Keep init phrase deterministic and supported by scenario to avoid "Я не понимаю" on boot.
              initPhrase: `Запусти ${smartAppName.replace(/_/g, ' ')}`,
              getState: getAssistantState as any,
              nativePanel: {
                defaultText: "Говорите!",
                screenshotMode: false,
                tabIndex: -1,
              },
            })
          : createAssistant({ getState: getAssistantState as any });

      setAssistantUiMode(canUseDebugger ? "debugger" : "host");

      assistantRef.current.on("start", () => setAssistantStatus("Подключен"));

      assistantRef.current.on("data", (command: AssistantCommand) => {
        const action = command.action;
        if (action?.type === "navigate" && isPageId(action.page)) {
          navigateTo(action.page as PageId);
          setLastCommand(`Backend: переход на ${action.page}`);
          return;
        }

        if (action?.type === "music_search" && typeof action.query === "string") {
          setMusicQuery(action.query);
          searchTracks(action.query);
          setLastCommand(`Backend: поиск музыки ${action.query}`);
          return;
        }

        if (action?.type === "focus_start") {
          const minutesValue =
            typeof action.minutes === "number"
              ? action.minutes
              : typeof action.minutes === "string"
                ? Number(action.minutes)
                : NaN;
          if (Number.isFinite(minutesValue) && minutesValue > 0) {
            const nextDuration = Math.round(minutesValue * 60);
            setFocusDuration(nextDuration);
            setFocusLeft(nextDuration);
            setFocusPresetType("custom");
          }
          setFocusRunning(true);
          navigateTo("focus");
          setLastCommand("Backend: запустили фокус-таймер");
          return;
        }

        if (action?.type === "focus_stop") {
          setFocusRunning(false);
          setLastCommand("Backend: остановили фокус-таймер");
          return;
        }

        if (action?.type === "add_note" && typeof action.note === "string") {
          const noteTitle = action.note.trim();
          if (noteTitle) {
            setTodos((prev) => [createTodoItem(noteTitle), ...prev]);
            setLastCommand(`Backend: добавили задачу ${noteTitle}`);
          }
          return;
        }

        if (action?.type === "done_note" && (typeof action.id === "string" || typeof action.id === "number")) {
          toggleTodoByAssistantId(String(action.id));
          setLastCommand("Backend: отметили задачу как выполненную");
          return;
        }

        if (action?.type === "done_note" && typeof action.note === "string") {
          toggleTodoByAssistantTitle(action.note);
          setLastCommand(`Backend: отметили задачу ${action.note}`);
          return;
        }

        if (action?.type === "delete_note" && (typeof action.id === "string" || typeof action.id === "number")) {
          removeTodoByAssistantId(String(action.id));
          setLastCommand("Backend: удалили задачу");
          return;
        }

        if (action?.type === "delete_note" && typeof action.note === "string") {
          removeTodoByAssistantTitle(action.note);
          setLastCommand(`Backend: удалили задачу ${action.note}`);
          return;
        }

        if (command.type === "navigation") {
          if (command.navigation?.command === "LEFT") {
            const pageIndex = Math.max(
              0,
              PAGES.findIndex((item) => item.id === pageRef.current) - 1
            );
            navigateTo(PAGES[pageIndex].id);
            setLastCommand("Навигация: влево");
            return;
          }
          if (command.navigation?.command === "RIGHT") {
            const pageIndex = Math.min(
              PAGES.length - 1,
              PAGES.findIndex((item) => item.id === pageRef.current) + 1
            );
            navigateTo(PAGES[pageIndex].id);
            setLastCommand("Навигация: вправо");
            return;
          }
        }

        if (command.type === "smart_app_data") {
          const commandType = command.smart_app_data?.type;
          const payload = command.smart_app_data?.payload;

          if (commandType === "navigate" && isPageId(payload?.page)) {
            navigateTo(payload.page as PageId);
            setLastCommand(`Backend: переход на ${String(payload.page)}`);
            return;
          }
          if (commandType === "add_todo" && typeof payload?.title === "string") {
            addTodo(payload.title);
            setLastCommand(`Backend: добавили задачу ${payload.title}`);
            return;
          }
          if (commandType === "music_search" && typeof payload?.query === "string") {
            setMusicQuery(payload.query);
            searchTracks(payload.query);
            setLastCommand(`Backend: поиск музыки ${payload.query}`);
            return;
          }
          if (typeof payload?.commandText === "string") {
            runLocalCommand(payload.commandText);
          }
        }
      });

      setAssistantStatus(canUseDebugger ? "Эмулятор активен" : "Устройство Сбера");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка подключения";
      console.error("[Nova Assistant] init error", error);
      setAssistantStatus(`Ошибка подключения: ${message}`);
      setAssistantUiMode("none");
    }
  }, [
    addTodo,
    getAssistantState,
    navigateTo,
    removeTodoByAssistantId,
    removeTodoByAssistantTitle,
    runLocalCommand,
    searchTracks,
    toggleTodoByAssistantId,
    toggleTodoByAssistantTitle,
  ]);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }

    const handleTimeUpdate = () => {
      if (audio.paused) {
        setPreviewCurrentTime(audio.currentTime || 0);
      }
    };
    const handleLoadedMetadata = () => setPreviewDuration(audio.duration || 0);
    const handlePlay = () => {
      setPreviewPlaying(true);
      startPreviewProgressLoop();
    };
    const handlePause = () => {
      setPreviewPlaying(false);
      stopPreviewProgressLoop();
    };
    const handleEnded = () => {
      setPreviewPlaying(false);
      stopPreviewProgressLoop();
      setPreviewCurrentTime(audio.duration || 0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    if (activePreviewUrl) {
      // Apply the current volume before autoplay so UI and sound level stay in sync.
      audio.volume = previewVolume;
      audio.load();
      void audio.play().then(
        () => {
          setPreviewPlaying(true);
          startPreviewProgressLoop();
        },
        () => setPreviewPlaying(false)
      );
    } else {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = previewVolume;
      stopPreviewProgressLoop();
      setPreviewCurrentTime(0);
      setPreviewDuration(0);
      setPreviewPlaying(false);
    }

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      stopPreviewProgressLoop();
    };
  }, [activePreviewUrl, startPreviewProgressLoop, stopPreviewProgressLoop]);

  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) {
      return;
    }
    audio.volume = previewVolume;
    window.localStorage.setItem("nova-preview-volume", String(previewVolume));
  }, [previewVolume]);

  useEffect(() => {
    if (assistantRef.current?.setGetState) {
      assistantRef.current.setGetState(getAssistantState);
    }
  }, [getAssistantState]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("nova-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!focusRunning) {
      return;
    }

    const timerId = window.setInterval(() => {
      setFocusLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timerId);
          setFocusRunning(false);
          setFocusSessions((value) => value + 1);
          sendFrontendAction("focus_session_complete");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [focusRunning, sendFrontendAction]);

  const handleTodoSubmit = (event: FormEvent) => {
    event.preventDefault();
    const created = addTodo(todoText);
    if (created) {
      setTodoText("");
    }
  };

  const setFocusPreset = (seconds: number, type: FocusPresetType) => {
    setFocusDuration(seconds);
    setFocusLeft(seconds);
    setFocusRunning(false);
    setFocusPresetType(type);
    setCustomMinutes(String(Math.round(seconds / 60)));
  };

  const applyManualFocusDuration = () => {
    const parsedMinutes = Number(customMinutes);
    if (!Number.isFinite(parsedMinutes)) {
      return;
    }

    const safeMinutes = Math.min(180, Math.max(1, Math.round(parsedMinutes)));
    setFocusPreset(safeMinutes * 60, "custom");
  };

  const pageContent: Record<PageId, ReactNode> = {
    home: (
      <section className="space-y-8">
        <div className="space-y-4">
          <h2 className={cn("text-4xl font-semibold tracking-tight md:text-5xl", isDark ? "text-white" : "text-slate-900")}>
            Мульти-страничный smartapp для ежедневных сценариев
          </h2>
          <p className={cn("max-w-3xl text-base md:text-lg", isDark ? "text-emerald-50/80" : "text-slate-700")}>
            Здесь есть три полезных рабочих потока: задачи с подпунктами, музыкальный раздел с поиском
            треков и фокус-таймер. Голос работает через нативную панель Сбера после подключения токена.
          </p>
        </div>
        <div className={cn("space-y-2 text-sm", isDark ? "text-emerald-50/75" : "text-slate-600")}>
          <p>Раздел Музыка можно связать с вашим backend и командами ассистента для сценариев выбора треков.</p>
          <p>
            Полноценное распознавание как Shazam обычно требует отдельного сервиса аудио-фингерпринтинга, но
            в интерфейсе уже есть demo-поток, который легко расширить до реального API.
          </p>
        </div>
      </section>
    ),
    tasks: (
      <section className="space-y-6">
        <form onSubmit={handleTodoSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={todoText}
            onChange={(event) => setTodoText(event.target.value)}
            className={cn(
              "h-12 flex-1 rounded-xl border px-4 text-sm outline-none transition",
              isDark
                ? "border-white/20 bg-white/10 text-white placeholder:text-emerald-50/40 focus:border-emerald-200"
                : "border-emerald-700/25 bg-white text-slate-900 placeholder:text-slate-500 focus:border-emerald-500"
            )}
            placeholder="Например: подготовить демонстрацию smartapp"
          />
          <button type="submit" className={cn("h-12 px-5 text-sm font-semibold", primaryButtonClass)}>
            Добавить задачу
          </button>
        </form>

        <div className="space-y-2">
          {filteredTodos.length === 0 ? (
            <p className={cn(isDark ? "text-emerald-50/65" : "text-slate-600")}>По текущему фильтру задач пока нет.</p>
          ) : null}

          {filteredTodos.map((todo, index) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "space-y-3 rounded-xl border px-4 py-3",
                isDark ? "border-white/15 bg-black/20" : "border-emerald-700/20 bg-white/85"
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    "text-left text-sm transition",
                    isDark
                      ? todo.done
                        ? "text-emerald-50/40 line-through hover:text-emerald-100"
                        : "text-emerald-50 hover:text-emerald-100"
                      : todo.done
                        ? "text-slate-500 line-through hover:text-slate-600"
                        : "text-slate-800 hover:text-slate-950"
                  )}
                >
                  {index + 1}. {todo.title}
                </button>
                <button type="button" onClick={() => removeTodo(todo.id)} className={cn("px-3 py-1 text-xs", ghostButtonClass)}>
                  Удалить
                </button>
              </div>

              <div className={cn("space-y-2 border-l pl-4", isDark ? "border-white/10" : "border-emerald-700/20")}>
                {todo.subtasks.map((subtask, subtaskIndex) => (
                  <div key={subtask.id} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSubtask(todo.id, subtask.id)}
                      className={cn(
                        "text-left text-xs transition",
                        isDark
                          ? subtask.done
                            ? "line-through text-emerald-50/40 hover:text-emerald-100"
                            : "text-emerald-50/85 hover:text-emerald-100"
                          : subtask.done
                            ? "line-through text-slate-500 hover:text-slate-600"
                            : "text-slate-700 hover:text-slate-900"
                      )}
                    >
                      {index + 1}.{subtaskIndex + 1} {subtask.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSubtask(todo.id, subtask.id)}
                      className={cn(
                        "text-[11px] transition",
                        isDark ? "text-emerald-100/70 hover:text-emerald-100" : "text-emerald-700/80 hover:text-emerald-800"
                      )}
                    >
                      убрать
                    </button>
                  </div>
                ))}

                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addSubtask(todo.id, subtaskDrafts[todo.id] ?? "");
                  }}
                >
                  <input
                    value={subtaskDrafts[todo.id] ?? ""}
                    onChange={(event) => setSubtaskDraft(todo.id, event.target.value)}
                    placeholder="Добавить шаг"
                    className={cn(
                      "h-9 flex-1 rounded-lg border px-3 text-xs outline-none",
                      isDark
                        ? "border-white/15 bg-white/5 text-white placeholder:text-emerald-50/40 focus:border-emerald-200"
                        : "border-emerald-700/25 bg-white text-slate-900 placeholder:text-slate-500 focus:border-emerald-500"
                    )}
                  />
                  <button type="submit" className={cn("h-9 px-3 text-xs font-semibold", ghostButtonClass)}>
                    + шаг
                  </button>
                </form>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    ),
    music: (
      <section className="space-y-6">
        <form onSubmit={handleMusicSubmit} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={musicQuery}
            onChange={(event) => setMusicQuery(event.target.value)}
            className={cn(
              "h-12 flex-1 rounded-xl border px-4 text-sm outline-none transition",
              isDark
                ? "border-white/20 bg-white/10 text-white placeholder:text-emerald-50/40 focus:border-emerald-200"
                : "border-emerald-700/25 bg-white text-slate-900 placeholder:text-slate-500 focus:border-emerald-500"
            )}
            placeholder="Название трека или исполнителя"
          />
          <button type="submit" className={cn("h-12 px-5 text-sm font-semibold", primaryButtonClass)}>
            Найти треки
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {FAVORITE_QUERIES.map((query) => (
            <button
              key={query}
              type="button"
              onClick={() => {
                setMusicQuery(query);
                searchTracks(query);
              }}
              className={cn("h-9 px-3 text-xs", ghostButtonClass)}
            >
              {query}
            </button>
          ))}
        </div>

        <div
          className={cn(
            "rounded-2xl border p-4",
            isDark ? "border-white/15 bg-black/25" : "border-emerald-700/20 bg-white/85"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Распознавание (demo)</h3>
              <p className={cn("text-xs", isDark ? "text-emerald-50/70" : "text-slate-600")}>
                Для production-режима подключается отдельный сервис распознавания аудио.
              </p>
            </div>
            <button
              type="button"
              onClick={runRecognitionDemo}
              disabled={recognitionLoading}
              className={cn("h-10 px-4 text-xs font-semibold disabled:opacity-40", primaryButtonClass)}
            >
              {recognitionLoading ? "Слушаем..." : "Распознать 8 сек"}
            </button>
          </div>

          {detectedTrack ? (
            <p className={cn("mt-3 text-sm", isDark ? "text-emerald-50/85" : "text-slate-700")}>
              Найдено: {detectedTrack.trackName} - {detectedTrack.artistName}
            </p>
          ) : null}
        </div>

        {musicLoading ? <p className={cn(isDark ? "text-emerald-50/70" : "text-slate-600")}>Ищем треки...</p> : null}
        {musicError ? <p className="text-sm text-rose-400">{musicError}</p> : null}

        <div className="space-y-2">
          {tracks.map((track) => (
            <div
              key={track.trackId}
              className={cn(
                "space-y-3 rounded-xl border px-4 py-3",
                isDark ? "border-white/15 bg-black/20" : "border-emerald-700/20 bg-white/85"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("truncate text-sm font-medium", isDark ? "text-emerald-50" : "text-slate-900")}>{track.trackName}</p>
                  <p className={cn("truncate text-xs", isDark ? "text-emerald-50/70" : "text-slate-600")}>
                    {track.artistName} {track.primaryGenreName ? `· ${track.primaryGenreName}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {track.previewUrl ? (
                    <a
                      href={track.previewUrl}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className={cn("inline-flex h-8 items-center rounded-xl px-3 text-xs", primaryButtonClass)}
                    >
                      Скачать
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="w-full">
                {track.previewUrl ? (
                  <button
                    type="button"
                    onClick={() => togglePreview(track.trackId, track.previewUrl)}
                    className={cn(
                      "inline-flex h-9 items-center rounded-lg border px-3 text-xs transition",
                      isDark
                        ? "border-white/20 text-emerald-50/90 hover:border-emerald-100/80 hover:bg-emerald-200/10"
                        : "border-emerald-700/25 text-emerald-800 hover:border-emerald-600/55 hover:bg-emerald-100/80"
                    )}
                  >
                    {activePreviewTrackId === track.trackId ? "Скрыть плеер" : "Прослушать"}
                  </button>
                ) : (
                  <p className={cn("text-xs", isDark ? "text-emerald-50/55" : "text-slate-500")}>
                    Превью недоступно для этого трека.
                  </p>
                )}
              </div>

              {activePreviewTrackId === track.trackId && track.previewUrl ? (
                <div
                  className={cn(
                    "space-y-3 rounded-xl border p-3",
                    isDark ? "border-emerald-100/20 bg-black/30" : "border-emerald-700/20 bg-emerald-50/70"
                  )}
                >
                  <audio ref={previewAudioRef} src={activePreviewUrl ?? undefined} preload="metadata" />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlayback}
                      className={cn("h-9 px-3 text-xs font-medium", primaryButtonClass)}
                    >
                      {previewPlaying ? "Пауза" : "Пуск"}
                    </button>
                    <span className={cn("text-xs tabular-nums", isDark ? "text-emerald-50/80" : "text-slate-700")}>
                      {formatTime(previewCurrentTime)} / {formatTime(previewDuration)}
                    </span>
                  </div>

                  <div className="grid gap-2">
                    <label className={cn("text-[11px] uppercase tracking-[0.15em]", isDark ? "text-emerald-100/60" : "text-emerald-700/70")}>
                      Перемотка
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(previewDuration, 1)}
                      step={0.1}
                      value={Math.min(previewCurrentTime, previewDuration || 1)}
                      onChange={(event) => seekPreview(Number(event.target.value))}
                      className="nova-range w-full"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className={cn("text-[11px] uppercase tracking-[0.15em]", isDark ? "text-emerald-100/60" : "text-emerald-700/70")}>
                      Громкость
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={previewVolume}
                      onChange={(event) => changePreviewVolume(Number(event.target.value))}
                      className="nova-range w-full"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    ),
    focus: (
      <section className="space-y-6">
        <div className="space-y-4">
          <div>
            <p className={cn("mb-2 text-xs uppercase tracking-[0.2em]", isDark ? "text-emerald-100/60" : "text-emerald-700/70")}>Рабочий таймер</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "15 мин", value: 15 * 60 },
                { label: "25 мин", value: 25 * 60 },
                { label: "45 мин", value: 45 * 60 },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setFocusPreset(preset.value, "work")}
                  className={cn(
                    "h-10 cursor-pointer select-none rounded-xl border px-4 text-sm transition",
                    focusPresetType === "work" && focusDuration === preset.value
                      ? isDark
                        ? "border-emerald-200 bg-emerald-100 text-[#062417]"
                        : "border-emerald-500/30 bg-emerald-500 text-white"
                      : ghostButtonClass
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={cn("mb-2 text-xs uppercase tracking-[0.2em]", isDark ? "text-emerald-100/60" : "text-emerald-700/70")}>Таймер отдыха</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "5 мин", value: 5 * 60 },
                { label: "10 мин", value: 10 * 60 },
                { label: "15 мин", value: 15 * 60 },
              ].map((preset) => (
                <button
                  key={`break-${preset.value}`}
                  type="button"
                  onClick={() => setFocusPreset(preset.value, "break")}
                  className={cn(
                    "h-10 cursor-pointer select-none rounded-xl border px-4 text-sm transition",
                    focusPresetType === "break" && focusDuration === preset.value
                      ? isDark
                        ? "border-emerald-200 bg-emerald-100 text-[#062417]"
                        : "border-emerald-500/30 bg-emerald-500 text-white"
                      : ghostButtonClass
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              max={180}
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
              className={cn(
                "h-10 w-28 rounded-xl border px-3 text-sm outline-none transition",
                isDark
                  ? "border-white/20 bg-white/10 text-white placeholder:text-emerald-50/40 focus:border-emerald-200"
                  : "border-emerald-700/25 bg-white text-slate-900 placeholder:text-slate-500 focus:border-emerald-500"
              )}
              placeholder="Мин"
            />
            <button
              type="button"
              onClick={applyManualFocusDuration}
              className={cn("h-10 cursor-pointer px-4 text-sm font-medium", ghostButtonClass)}
            >
              Установить вручную
            </button>
          </div>
        </div>

        <div className={cn("rounded-2xl border p-6 text-center", isDark ? "border-white/15 bg-black/25" : "border-emerald-700/20 bg-white/85")}>
          <p className={cn("text-xs uppercase tracking-[0.24em]", isDark ? "text-emerald-100/60" : "text-emerald-700/70")}>Текущее время</p>
          <motion.p
            key={focusLeft}
            initial={{ scale: 0.97, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="mt-4 text-6xl font-semibold tracking-tight"
          >
            {formatTime(focusLeft)}
          </motion.p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFocusRunning((prev) => !prev);
                sendFrontendAction("focus_toggle", { running: !focusRunning });
              }}
              className={cn("h-11 cursor-pointer px-5 text-sm font-semibold", primaryButtonClass)}
            >
              {focusRunning ? "Пауза" : "Старт"}
            </button>
            <button
              type="button"
              onClick={() => {
                setFocusLeft(focusDuration);
                setFocusRunning(false);
              }}
              className={cn("h-11 cursor-pointer px-5 text-sm", ghostButtonClass)}
            >
              Сброс
            </button>
          </div>
        </div>

        <div className={cn("rounded-2xl border p-4", isDark ? "border-white/15 bg-black/25" : "border-emerald-700/20 bg-white/85")}>
          <p className={cn("text-xs uppercase tracking-[0.2em]", isDark ? "text-emerald-100/60" : "text-emerald-700/70")}>Статистика</p>
          <p className={cn("mt-2 text-sm", isDark ? "text-emerald-50/80" : "text-slate-700")}>
            Завершено фокус-сессий: {focusSessions}
          </p>
        </div>
      </section>
    ),
  };

  const sidePanel: Record<PageId, ReactNode> = {
    home: (
      <>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Что добавить дальше</h3>
          <p className={cn("text-sm", isDark ? "text-emerald-50/70" : "text-slate-600")}>Варианты расширения вашего smartapp.</p>
        </div>
        <ul className={cn("mt-4 space-y-2 text-sm", isDark ? "text-emerald-50/85" : "text-slate-700")}>
          <li>Связка с backend для реального распознавания треков.</li>
          <li>Голосовые сценарии: "включи подборку для фокуса".</li>
          <li>Синхронизация задач между устройствами пользователя.</li>
        </ul>
      </>
    ),
    tasks: (
      <>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Фокус и прогресс</h3>
          <p className={cn("text-sm", isDark ? "text-emerald-50/70" : "text-slate-600")}>Фильтры и быстрые действия по задачам.</p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { id: "all", label: "Все" },
            { id: "active", label: "Активные" },
            { id: "done", label: "Готово" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTodoFilter(item.id as TodoFilter)}
              className={cn(
                "h-10 rounded-xl border text-xs font-medium transition duration-200",
                todoFilter === item.id
                  ? isDark
                    ? "border-emerald-200 bg-emerald-100 text-[#062417]"
                    : "border-emerald-500/30 bg-emerald-500 text-white"
                  : isDark
                    ? "border-white/20 text-emerald-50/90 hover:border-emerald-100/80 hover:bg-emerald-200/10 hover:shadow-[0_10px_28px_-16px_rgba(89,244,181,0.9)]"
                    : "border-emerald-700/25 text-emerald-800 hover:border-emerald-600/55 hover:bg-emerald-100/80 hover:shadow-[0_10px_22px_-16px_rgba(16,185,129,0.5)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={cn("mt-5 space-y-2 rounded-2xl border p-4", isDark ? "border-white/15 bg-black/25" : "border-emerald-700/20 bg-white/80")}>
          <div
            className={cn(
              "flex items-center justify-between text-xs uppercase tracking-[0.2em]",
              isDark ? "text-emerald-100/60" : "text-emerald-800/70"
            )}
          >
            <span>Прогресс</span>
            <span>{progress}%</span>
          </div>
          <div className={cn("h-2 overflow-hidden rounded-full", isDark ? "bg-white/10" : "bg-emerald-100")}>
            <motion.div
              className={cn(
                "h-full rounded-full",
                isDark ? "bg-gradient-to-r from-emerald-300 to-cyan-300" : "bg-gradient-to-r from-emerald-500 to-cyan-500"
              )}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          </div>
          <p className={cn("text-sm", isDark ? "text-emerald-50/80" : "text-slate-700")}>Выполнено {completedCount} из {todos.length}</p>
        </div>

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            onClick={completeAllTodos}
            disabled={todos.length === 0 || completedCount === todos.length}
            className={cn("h-11 w-full text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40", primaryButtonClass)}
          >
            Завершить все
          </button>
          <button
            type="button"
            onClick={clearCompletedTodos}
            disabled={completedCount === 0}
            className={cn("h-10 w-full text-sm disabled:cursor-not-allowed disabled:opacity-40", ghostButtonClass)}
          >
            Очистить выполненные
          </button>
        </div>
      </>
    ),
    music: (
      <>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Интеграция музыки</h3>
          <p className={cn("text-sm", isDark ? "text-emerald-50/70" : "text-slate-600")}>Как перейти к версии ближе к Shazam.</p>
        </div>
        <ul className={cn("mt-4 space-y-2 text-sm", isDark ? "text-emerald-50/85" : "text-slate-700")}>
          <li>1. Захват фрагмента аудио с микрофона на клиенте.</li>
          <li>2. Отправка в backend для аудио-фингерпринта.</li>
          <li>3. Возврат найденного трека и запуск в плеере.</li>
        </ul>
        <a
          className={cn("mt-4 inline-flex h-10 items-center px-4 text-sm", ghostButtonClass)}
          href="https://zvuk.com/login?returnUrl=/settings"
          target="_blank"
          rel="noreferrer"
        >
          Открыть СберЗвук
        </a>
      </>
    ),
    focus: (
      <>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Рекомендации фокуса</h3>
          <p className={cn("text-sm", isDark ? "text-emerald-50/70" : "text-slate-600")}>Работа и отдых в одном управлении.</p>
        </div>
        <ul className={cn("mt-4 space-y-2 text-sm", isDark ? "text-emerald-50/85" : "text-slate-700")}>
          <li>Быстрые кнопки запускают рабочие и перерывные таймеры.</li>
          <li>Можно задать любое время вручную от 1 до 180 минут.</li>
          <li>После 3-4 сессий делайте длинный перерыв 15-20 минут.</li>
        </ul>
      </>
    ),
  };

  return (
    <div className={shellClass}>
      <motion.div
        className={cn(
          "pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full blur-3xl",
          isDark ? "bg-emerald-400/28" : "bg-emerald-300/45"
        )}
        animate={{ x: [0, 50, 0], y: [0, 20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "pointer-events-none absolute right-0 top-32 h-[28rem] w-[28rem] rounded-full blur-3xl",
          isDark ? "bg-cyan-400/20" : "bg-cyan-300/40"
        )}
        animate={{ x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className={cn(
          "relative mx-auto flex w-full max-w-7xl flex-col gap-7 px-6 py-8 lg:py-10",
          assistantUiMode === "debugger" ? "pb-44 lg:pb-52" : "pb-8"
        )}
      >
        <header
          className={cn(
            "space-y-6 rounded-3xl border p-6 backdrop-blur-xl",
            isDark
              ? "border-white/15 bg-gradient-to-r from-[#0a2317]/80 via-[#0a3024]/70 to-[#081d2b]/80 shadow-[0_20px_90px_-40px_rgba(47,255,164,0.75)]"
              : "border-emerald-700/20 bg-gradient-to-r from-[#f8fffb]/90 via-[#eefaf4]/90 to-[#ebf8ff]/90 shadow-[0_20px_80px_-50px_rgba(17,94,89,0.45)]"
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className={cn("text-xs uppercase tracking-[0.28em]", isDark ? "text-emerald-100/75" : "text-emerald-800/80")}>Sber SmartApp</div>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Nova Voice Canvas</h1>
              <p className={cn("mt-3 max-w-2xl", isDark ? "text-emerald-50/80" : "text-slate-700")}>{pageMeta[page].description}</p>
            </div>
            <div className="flex items-center gap-2 self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
                className={cn(
                  "h-9 rounded-lg border px-3 text-xs transition",
                  isDark
                    ? "border-white/20 bg-black/20 text-emerald-100/85 hover:border-emerald-100/80 hover:bg-emerald-300/10"
                    : "border-emerald-700/30 bg-white/80 text-emerald-800 hover:border-emerald-600/60 hover:bg-emerald-100/75"
                )}
              >
                Тема: {isDark ? "темная" : "светлая"}
              </button>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {PAGES.map((item) => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={cn(
                  "relative h-11 rounded-full px-4 text-sm transition duration-200",
                  page === item.id
                    ? isDark
                      ? "text-[#042117]"
                      : "text-white"
                    : isDark
                      ? "border border-white/20 text-emerald-50/85 hover:border-emerald-100/80 hover:bg-emerald-200/10 hover:shadow-[0_10px_26px_-16px_rgba(86,249,186,0.9)]"
                      : "border border-emerald-700/30 text-emerald-800 hover:border-emerald-600/60 hover:bg-emerald-100/70 hover:shadow-[0_10px_24px_-16px_rgba(16,185,129,0.55)]"
                )}
              >
                {page === item.id ? (
                  <motion.span
                    layoutId="page-pill"
                    className={cn(
                      "absolute inset-0 rounded-full",
                      isDark ? "bg-gradient-to-r from-emerald-300 to-cyan-300" : "bg-gradient-to-r from-emerald-500 to-cyan-500"
                    )}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                ) : null}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </nav>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className={cn("rounded-3xl border p-6 backdrop-blur-xl", isDark ? "border-white/15 bg-black/25" : "border-emerald-700/20 bg-white/75")}>
            <div className="mb-5">
              <p className={cn("text-xs uppercase tracking-[0.2em]", isDark ? "text-emerald-100/65" : "text-emerald-800/70")}>{PAGES.find((item) => item.id === page)?.subtitle}</p>
              <h2 className="mt-1 text-3xl font-semibold">{pageMeta[page].title}</h2>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.26, ease: "easeOut" }}
              >
                {pageContent[page]}
              </motion.div>
            </AnimatePresence>
          </section>

          <section
            className={cn(
              "rounded-3xl border p-5 backdrop-blur-xl",
              isDark ? "border-white/15 bg-gradient-to-b from-black/35 to-[#08170f]/75" : "border-emerald-700/20 bg-gradient-to-b from-white/85 to-[#edf8f2]/90"
            )}
          >
            {sidePanel[page]}
          </section>
        </div>
      </div>
    </div>
  );
}
