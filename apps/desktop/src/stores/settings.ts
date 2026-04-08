import { computed, reactive, ref } from "vue";
import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import {
  createDefaultAppConfig,
  createDefaultProviderConfig,
  DEFAULT_BIDIRECTIONAL_LANGUAGE_ROUTING_RULE,
  DEFAULT_BRANCHING_LANGUAGE_ROUTING_RULE,
  DEFAULT_FIXED_LANGUAGE_ROUTING_RULE,
  DEFAULT_MAX_TOKENS,
  MAX_DOUBLE_COPY_WINDOW_MS,
  MAX_HISTORY_LIMIT,
  MAX_MAX_TOKENS,
  MAX_TIMEOUT_SECS,
  MAX_TOP_P,
  MAX_TEMPERATURE,
  MIN_DOUBLE_COPY_WINDOW_MS,
  MIN_MAX_TOKENS,
  MIN_TIMEOUT_SECS,
  MIN_TOP_P,
  MIN_TEMPERATURE,
  type AppConfig,
  type AuthScheme,
  type LanguageRoutingRule,
  type ProviderConfig,
  type ProviderKind,
  type RoutingKind,
  type ThemeMode,
} from "@cliplingo/shared-types";
import {
  validateHeaderNameInput,
  validateHeaderValueInput,
  validateProviderBaseUrl,
} from "@/utils/security";
import type { TranslationCommandOutput } from "@/components/translation/types";
import { getDefaultProviderDraft } from "@/config/providerDefaults";

export interface ProviderDraft extends Omit<ProviderConfig, "organization"> {
  apiKeyDraft: string;
  organization: string;
}

export interface FieldValidation {
  valid: boolean;
  message: string | null;
}

export interface ProviderValidation {
  id: FieldValidation;
  name: FieldValidation;
  baseUrl: FieldValidation;
  path: FieldValidation;
  apiKey: FieldValidation;
  model: FieldValidation;
  temperature: FieldValidation;
  topP: FieldValidation;
  maxTokens: FieldValidation;
  timeoutSecs: FieldValidation;
  headers: FieldValidation;
  hasErrors: boolean;
}

export interface SettingsValidation {
  ui: {
    themeMode: FieldValidation;
  };
  trigger: {
    doubleCopyWindowMs: FieldValidation;
    fallbackShortcut: FieldValidation;
  };
  translation: {
    routingRule: FieldValidation;
    userRules: FieldValidation;
  };
  history: {
    maxItems: FieldValidation;
  };
  debug: {
    logRawNetworkErrors: FieldValidation;
  };
  providers: ProviderValidation[];
  hasErrors: boolean;
}

export interface SettingsSummary {
  providerCount: number;
  activeProviderName: string;
  themeMode: ThemeMode;
  doubleCopyWindowMs: number;
  routingKind: RoutingKind;
  hasErrors: boolean;
}

export interface InitializeSettingsOptions {
  timeoutMs?: number;
  force?: boolean;
}

export type PersistState = "idle" | "saving" | "saved" | "error";
export type ConnectionTestState = "idle" | "running" | "success" | "error";
export type StatusTone = "info" | "success" | "warning" | "error";

interface ProviderSecretStatus {
  providerId: string;
  hasSecret: boolean;
}

interface StatusLine {
  tone: StatusTone;
  message: string;
  at: number;
}

function createProviderDraft(
  overrides: Partial<ProviderDraft> = {},
): ProviderDraft {
  return {
    ...createDefaultProviderConfig(),
    ...overrides,
    customHeaders: overrides.customHeaders
      ? overrides.customHeaders.map((header) => ({ ...header }))
      : overrides.customHeaders ?? [],
    apiKeyDraft: overrides.apiKeyDraft ?? "",
    organization: overrides.organization ?? "",
  };
}

function createRoutingRule(kind: RoutingKind): LanguageRoutingRule {
  switch (kind) {
    case "bidirectional":
      return { ...DEFAULT_BIDIRECTIONAL_LANGUAGE_ROUTING_RULE };
    case "fixed":
      return { ...DEFAULT_FIXED_LANGUAGE_ROUTING_RULE };
    case "branching":
    default:
      return { ...DEFAULT_BRANCHING_LANGUAGE_ROUTING_RULE };
  }
}

function createInitialDraft(): AppConfig {
  return createDefaultAppConfig();
}

function createEmptyField(message: string): FieldValidation {
  return { valid: false, message };
}

function createValidField(): FieldValidation {
  return { valid: true, message: null };
}

function trimList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

function splitList(value: string): string[] {
  return trimList(
    value
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
}

function joinList(values: readonly string[]): string {
  return values.join(", ");
}

function validateLanguageList(value: readonly string[], fieldName: string): FieldValidation {
  if (!value.length) {
    return createEmptyField(`${fieldName} needs at least one language code.`);
  }

  if (value.some((item) => !item.trim())) {
    return createEmptyField(`${fieldName} cannot contain empty items.`);
  }

  return createValidField();
}

function validateUrl(value: string): FieldValidation {
  const message = validateProviderBaseUrl(value);
  return message ? createEmptyField(message) : createValidField();
}

function validateHeaderName(value: string): FieldValidation {
  const message = validateHeaderNameInput(value);
  return message ? createEmptyField(message) : createValidField();
}

function validateHeaderValue(value: string): FieldValidation {
  const message = validateHeaderValueInput(value);
  return message ? createEmptyField(message) : createValidField();
}

function validateShortcut(value: string): FieldValidation {
  if (!value.trim()) {
    return createEmptyField("Fallback shortcut is required.");
  }

  if (!/[+]/.test(value)) {
    return createEmptyField("Shortcut should include modifiers, such as CmdOrCtrl+Shift+Y.");
  }

  return createValidField();
}

function validateNumberInRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): FieldValidation {
  if (!Number.isFinite(value)) {
    return createEmptyField(`${label} must be a number.`);
  }

  if (value < minimum || value > maximum) {
    return createEmptyField(`${label} must be between ${minimum} and ${maximum}.`);
  }

  return createValidField();
}

function providerSummary(provider: ProviderDraft): string {
  return provider.name.trim() || provider.id.trim() || "Untitled provider";
}

function createValidationSnapshot(draft: AppConfig, providers: ProviderDraft[]): SettingsValidation {
  const routingRule = draft.translation.routingRule;
  const routingValidation = (() => {
    switch (routingRule.kind) {
      case "bidirectional":
        return [
          validateLanguageList(
            [routingRule.primarySourceLanguage],
            "Primary source language",
          ),
          validateLanguageList(routingRule.primaryTargetLanguages, "Primary target languages"),
          validateLanguageList(
            [routingRule.secondarySourceLanguage],
            "Secondary source language",
          ),
          validateLanguageList(
            routingRule.secondaryTargetLanguages,
            "Secondary target languages",
          ),
        ];
      case "fixed":
        return [validateLanguageList(routingRule.targetLanguages, "Fixed target languages")];
      case "branching":
      default:
        return [
          validateLanguageList([routingRule.englishSourceLanguage], "English source language"),
          validateLanguageList(routingRule.englishTargetLanguages, "English target languages"),
          validateLanguageList([routingRule.chineseSourceLanguage], "Chinese source language"),
          validateLanguageList(routingRule.chineseTargetLanguages, "Chinese target languages"),
          validateLanguageList(routingRule.fallbackTargetLanguages, "Fallback target languages"),
        ];
    }
  })();

  const providerValidation = providers.map((provider) => {
    const customHeaderIssues = provider.customHeaders.flatMap((header) => [
      validateHeaderName(header.name),
      validateHeaderValue(header.value),
    ]);

    return {
      id: provider.id.trim()
        ? createValidField()
        : createEmptyField("Provider id is required."),
      name: provider.name.trim()
        ? createValidField()
        : createEmptyField("Provider name is required."),
      baseUrl: validateUrl(provider.baseUrl),
      path: provider.path.trim()
        ? createValidField()
        : createEmptyField("Request path is required."),
      apiKey:
        provider.authScheme === "none" || provider.apiKeyDraft.trim()
          ? createValidField()
          : createEmptyField("API key is required for bearer auth."),
      model: provider.model.trim()
        ? createValidField()
        : createEmptyField("Model is required."),
      temperature: validateNumberInRange(
        provider.temperature,
        MIN_TEMPERATURE,
        MAX_TEMPERATURE,
        "Temperature",
      ),
      topP: validateNumberInRange(provider.topP, MIN_TOP_P, MAX_TOP_P, "Top P"),
      maxTokens: validateNumberInRange(
        provider.maxTokens ?? DEFAULT_MAX_TOKENS,
        MIN_MAX_TOKENS,
        MAX_MAX_TOKENS,
        "Max tokens",
      ),
      timeoutSecs: validateNumberInRange(
        provider.timeoutSecs,
        MIN_TIMEOUT_SECS,
        MAX_TIMEOUT_SECS,
        "Timeout",
      ),
      headers:
        customHeaderIssues.find((issue) => !issue.valid) ?? createValidField(),
      hasErrors:
        [
          provider.id.trim(),
          provider.name.trim(),
          provider.baseUrl.trim(),
          provider.path.trim(),
          provider.model.trim(),
        ].some((value) => !value) ||
        (provider.authScheme === "bearer" && !provider.apiKeyDraft.trim()) ||
        customHeaderIssues.some((issue) => !issue.valid) ||
        !validateUrl(provider.baseUrl).valid ||
        !validateNumberInRange(provider.temperature, MIN_TEMPERATURE, MAX_TEMPERATURE, "Temperature").valid ||
        !validateNumberInRange(provider.topP, MIN_TOP_P, MAX_TOP_P, "Top P").valid ||
        !validateNumberInRange(provider.maxTokens ?? DEFAULT_MAX_TOKENS, MIN_MAX_TOKENS, MAX_MAX_TOKENS, "Max tokens").valid ||
        !validateNumberInRange(provider.timeoutSecs, MIN_TIMEOUT_SECS, MAX_TIMEOUT_SECS, "Timeout").valid,
    } satisfies ProviderValidation;
  });

  const validation: SettingsValidation = {
    ui: {
      themeMode:
        ["system", "light", "dark"].includes(draft.ui.themeMode)
          ? createValidField()
          : createEmptyField("Choose a supported theme mode."),
    },
    trigger: {
      doubleCopyWindowMs: validateNumberInRange(
        draft.trigger.doubleCopyWindowMs,
        MIN_DOUBLE_COPY_WINDOW_MS,
        MAX_DOUBLE_COPY_WINDOW_MS,
        "Double copy window",
      ),
      fallbackShortcut: validateShortcut(draft.trigger.fallbackShortcut),
    },
    translation: {
      routingRule:
        routingValidation.every((item) => item.valid)
          ? createValidField()
          : createEmptyField("Check the language routing fields."),
      userRules:
        draft.translation.userRules && draft.translation.userRules.trim()
          ? createValidField()
          : createValidField(),
    },
    history: {
      maxItems: validateNumberInRange(
        draft.history.maxItems,
        1,
        MAX_HISTORY_LIMIT,
        "History limit",
      ),
    },
    debug: {
      logRawNetworkErrors: createValidField(),
    },
    providers: providerValidation,
    hasErrors: false,
  };

  validation.hasErrors =
    !validation.ui.themeMode.valid ||
    !validation.trigger.doubleCopyWindowMs.valid ||
    !validation.trigger.fallbackShortcut.valid ||
    !validation.translation.routingRule.valid ||
    !validation.history.maxItems.valid ||
    providerValidation.some((provider) => provider.hasErrors);

  return validation;
}

export const useSettingsStore = defineStore("settings", () => {
  const draft = reactive(createInitialDraft());
  const providers = reactive<ProviderDraft[]>([]);
  const activeProviderId = ref<string | null>(null);
  const selectedProviderId = ref<string | null>(null);
  const validation = computed(() => createValidationSnapshot(draft, providers));
  const initialized = ref(false);
  const initializing = ref(false);
  const persistState = ref<PersistState>("idle");
  const persistError = ref<string | null>(null);
  const testState = ref<ConnectionTestState>("idle");
  const testMessage = ref<string | null>(null);
  const providerApiKeyRefMap = reactive<Record<string, string | null>>({});
  const providerSecretStateMap = reactive<Record<string, boolean>>({});
  const lastPersistedSignature = ref("");
  const statusLine = ref<StatusLine | null>(null);

  const summary = computed<SettingsSummary>(() => {
    const activeProvider = providers.find((provider) => provider.id === activeProviderId.value);
    return {
      providerCount: providers.length,
      activeProviderName: activeProvider ? providerSummary(activeProvider) : "No active provider",
      themeMode: draft.ui.themeMode,
      doubleCopyWindowMs: draft.trigger.doubleCopyWindowMs,
      routingKind: draft.translation.routingRule.kind,
      hasErrors: validation.value.hasErrors,
    };
  });

  const localSignature = computed(() =>
    JSON.stringify({
      draft,
      providers: providers.map((provider) => ({
        ...provider,
        apiKeyDraft: provider.apiKeyDraft.trim() ? "__provided__" : "",
      })),
      activeProviderId: activeProviderId.value,
    }),
  );

  const hasUnsavedChanges = computed(
    () =>
      initialized.value && localSignature.value !== lastPersistedSignature.value,
  );

  function resetAll() {
    const fresh = createInitialDraft();
    draft.ui = fresh.ui;
    draft.trigger = fresh.trigger;
    draft.translation = fresh.translation;
    draft.history = fresh.history;
    draft.debug = fresh.debug;
    providers.splice(0, providers.length);
    activeProviderId.value = null;
    selectedProviderId.value = null;
  }

  function setRoutingKind(kind: RoutingKind) {
    draft.translation.routingRule = createRoutingRule(kind);
  }

  function addProvider() {
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const envDefaults = getDefaultProviderDraft();
    const nextProvider = createProviderDraft({
      ...envDefaults,
      id: providers.some((provider) => provider.id === envDefaults.id)
        ? `${envDefaults.id || "provider"}-${suffix}`
        : envDefaults.id ?? `provider-${suffix}`,
      name: envDefaults.name || `Provider ${providers.length + 1}`,
    });
    providers.push(nextProvider);
    selectedProviderId.value = nextProvider.id;
    if (!activeProviderId.value) {
      activeProviderId.value = nextProvider.id;
    }
  }

  function duplicateProvider(providerId: string) {
    const existing = providers.find((provider) => provider.id === providerId);
    if (!existing) {
      return;
    }

    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const duplicateId = `${existing.id || "provider"}-${suffix}`;
    const next = createProviderDraft({
      ...existing,
      id: duplicateId,
      name: `${existing.name || existing.id || "Provider"} Copy`,
      customHeaders: existing.customHeaders.map((header) => ({ ...header })),
      apiKeyDraft: existing.apiKeyDraft,
      organization: existing.organization ?? "",
    });
    providers.push(next);
    selectedProviderId.value = next.id;
    setStatus("success", `Duplicated provider ${existing.id}.`);
  }

  function removeProvider(providerId: string) {
    const index = providers.findIndex((provider) => provider.id === providerId);
    if (index < 0) {
      return;
    }

    providers.splice(index, 1);
    if (activeProviderId.value === providerId) {
      activeProviderId.value = providers[0]?.id ?? null;
    }
    if (selectedProviderId.value === providerId) {
      selectedProviderId.value = providers[0]?.id ?? null;
    }
  }

  function selectProvider(providerId: string) {
    if (providers.some((provider) => provider.id === providerId)) {
      selectedProviderId.value = providerId;
      activeProviderId.value = providerId;
    }
  }

  function makeProviderActive(providerId: string) {
    if (providers.some((provider) => provider.id === providerId)) {
      activeProviderId.value = providerId;
      selectedProviderId.value = providerId;
    }
  }

  function addProviderHeader(providerId: string) {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider) {
      return;
    }

    provider.customHeaders.push({ name: "", value: "" });
  }

  function removeProviderHeader(providerId: string, index: number) {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider || index < 0 || index >= provider.customHeaders.length) {
      return;
    }

    provider.customHeaders.splice(index, 1);
  }

  function updateProviderKind(providerId: string, kind: ProviderKind) {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider) {
      return;
    }

    provider.kind = kind;
  }

  function updateProviderAuthScheme(providerId: string, authScheme: AuthScheme) {
    const provider = providers.find((item) => item.id === providerId);
    if (!provider) {
      return;
    }

    provider.authScheme = authScheme;
  }

  function setStatus(tone: StatusTone, message: string) {
    statusLine.value = { tone, message, at: Date.now() };
  }

  async function invokeWithTimeout<T>(
    command: string,
    payload?: Record<string, unknown>,
    timeoutMs = 8_000,
  ): Promise<T> {
    let timer: number | null = null;
    try {
      return await Promise.race([
        invoke<T>(command, payload),
        new Promise<T>((_, reject) => {
          timer = window.setTimeout(() => {
            reject(new Error(`Command ${command} timed out after ${timeoutMs} ms`));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    }
  }

  function applyConfig(config: AppConfig) {
    draft.schemaVersion = 1;
    draft.ui = { ...config.ui };
    draft.trigger = { ...config.trigger };
    draft.translation = {
      ...config.translation,
      routingRule: { ...config.translation.routingRule },
    };
    draft.history = { ...config.history };
    draft.debug = { ...config.debug };

    providers.splice(
      0,
      providers.length,
      ...config.providers.map((provider) =>
        createProviderDraft({
          ...provider,
          customHeaders: provider.customHeaders.map((header) => ({ ...header })),
          apiKeyDraft: "",
          organization: provider.organization ?? "",
        }),
      ),
    );

    for (const key of Object.keys(providerApiKeyRefMap)) {
      delete providerApiKeyRefMap[key];
    }
    for (const key of Object.keys(providerSecretStateMap)) {
      delete providerSecretStateMap[key];
    }
    for (const provider of config.providers) {
      providerApiKeyRefMap[provider.id] = provider.apiKeyRef ?? null;
      providerSecretStateMap[provider.id] = false;
    }

    const resolvedActiveId =
      config.activeProviderId && providers.some((provider) => provider.id === config.activeProviderId)
        ? config.activeProviderId
        : providers[0]?.id ?? null;

    activeProviderId.value = resolvedActiveId;
    selectedProviderId.value = resolvedActiveId;
  }

  function toConfigPayload(): AppConfig {
    return {
      schemaVersion: 1,
      ui: { ...draft.ui },
      trigger: { ...draft.trigger },
      translation: {
        ...draft.translation,
        routingRule: { ...draft.translation.routingRule },
      },
      history: { ...draft.history },
      debug: { ...draft.debug },
      providers: providers.map((provider) => ({
        id: provider.id.trim(),
        name: provider.name.trim(),
        kind: provider.kind,
        baseUrl: provider.baseUrl.trim(),
        path: provider.path.trim(),
        authScheme: provider.authScheme,
        apiKeyRef: providerApiKeyRefMap[provider.id] ?? null,
        organization: provider.organization.trim() || null,
        model: provider.model.trim(),
        temperature: provider.temperature,
        topP: provider.topP,
        maxTokens: provider.maxTokens,
        timeoutSecs: provider.timeoutSecs,
        customHeaders: provider.customHeaders.map((header) => ({
          name: header.name.trim(),
          value: header.value.trim(),
        })),
        enabled: provider.enabled,
      })),
      activeProviderId: activeProviderId.value,
    };
  }

  async function initialize(options: InitializeSettingsOptions = {}) {
    const { timeoutMs = 8_000, force = false } = options;
    const initializationSignature = localSignature.value;

    if (!force && (initialized.value || initializing.value)) {
      return;
    }

    if (force) {
      initialized.value = false;
    }

    initializing.value = true;
    persistError.value = null;

    try {
      console.info("[settings] initialize:start");
      const loaded = await invokeWithTimeout<AppConfig>(
        "load_app_config",
        undefined,
        timeoutMs,
      );
      if (!force && localSignature.value !== initializationSignature) {
        initialized.value = true;
        persistState.value = "idle";
        setStatus("info", "Skipped loading saved settings because local edits already started.");
        return;
      }
      applyConfig(loaded);
      await refreshProviderSecretStatuses();
      lastPersistedSignature.value = localSignature.value;
      persistState.value = "saved";
      initialized.value = true;
      setStatus("success", "Settings loaded.");
      console.info("[settings] initialize:success", {
        providers: providers.length,
        activeProviderId: activeProviderId.value,
      });
    } catch (error) {
      persistState.value = "error";
      persistError.value = error instanceof Error ? error.message : String(error);
      initialized.value = true;
      lastPersistedSignature.value = localSignature.value;
      setStatus("warning", `Settings load skipped: ${persistError.value}`);
      console.error("[settings] initialize:failed", error);
    } finally {
      initializing.value = false;
    }
  }

  async function persist() {
    persistState.value = "saving";
    persistError.value = null;
    console.info("[settings] persist:start", {
      providerCount: providers.length,
      activeProviderId: activeProviderId.value,
    });

    try {
      const payload = toConfigPayload();
      const pendingSecrets = providers
        .filter((provider) => provider.authScheme === "bearer" && provider.apiKeyDraft.trim())
        .map((provider) => ({
          providerId: provider.id.trim(),
          apiKey: provider.apiKeyDraft.trim(),
        }));
      const saved = await invokeWithTimeout<AppConfig>("save_app_config", {
        config: payload,
      });

      for (const pendingSecret of pendingSecrets) {
        const secretStatus = await invokeWithTimeout<ProviderSecretStatus>(
          "set_provider_api_key",
          {
            providerId: pendingSecret.providerId,
            apiKey: pendingSecret.apiKey,
          },
        );
        providerSecretStateMap[pendingSecret.providerId] = secretStatus.hasSecret;
      }

      applyConfig(saved);

      await refreshProviderSecretStatuses();

      lastPersistedSignature.value = localSignature.value;
      persistState.value = "saved";
      setStatus("success", "Settings saved.");
      console.info("[settings] persist:success");
    } catch (error) {
      persistState.value = "error";
      persistError.value = error instanceof Error ? error.message : String(error);
      setStatus("error", `Failed to save: ${persistError.value}`);
      console.error("[settings] persist:failed", error);
      throw error;
    }
  }

  async function testConnection() {
    testState.value = "running";
    testMessage.value = null;
    console.info("[settings] test:start", {
      activeProviderId: activeProviderId.value ?? selectedProviderId.value,
    });

    try {
      await persist();
      const providerId = activeProviderId.value ?? selectedProviderId.value;
      const result = await invokeWithTimeout<TranslationCommandOutput>(
        "translate_text",
        {
          input: {
            text: "hello",
            providerId: providerId ?? undefined,
            targetLanguages: ["zh-CN"],
          },
        },
        15_000,
      );

      if (result.error) {
        testState.value = "error";
        testMessage.value = result.error.message;
        setStatus("error", `Test failed: ${result.error.message}`);
        console.warn("[settings] test:provider-error", result.error);
        return false;
      }

      testState.value = "success";
      testMessage.value = "Connection test passed. Translation is available.";
      setStatus("success", "Connection test passed.");
      console.info("[settings] test:success", {
        providerId: result.providerId,
        model: result.model,
      });
      return true;
    } catch (error) {
      testState.value = "error";
      testMessage.value = error instanceof Error ? error.message : String(error);
      setStatus("error", `Test failed: ${testMessage.value}`);
      console.error("[settings] test:failed", error);
      return false;
    }
  }

  async function refreshProviderSecretStatuses() {
    for (const provider of providers) {
      if (provider.authScheme === "none") {
        providerSecretStateMap[provider.id] = false;
        continue;
      }
      try {
        const secretStatus = await invokeWithTimeout<ProviderSecretStatus>(
          "get_provider_api_key_status",
          {
            providerId: provider.id,
          },
        );
        providerSecretStateMap[provider.id] = secretStatus.hasSecret;
      } catch {
        providerSecretStateMap[provider.id] = false;
      }
    }
  }

  function hasProviderSecret(providerId: string): boolean {
    return providerSecretStateMap[providerId] === true;
  }

  return {
    draft,
    providers,
    activeProviderId,
    selectedProviderId,
    validation,
    summary,
    initialized,
    initializing,
    persistState,
    persistError,
    testState,
    testMessage,
    hasUnsavedChanges,
    statusLine,
    resetAll,
    setRoutingKind,
    addProvider,
    duplicateProvider,
    removeProvider,
    selectProvider,
    makeProviderActive,
    addProviderHeader,
    removeProviderHeader,
    updateProviderKind,
    updateProviderAuthScheme,
    initialize,
    persist,
    testConnection,
    hasProviderSecret,
    refreshProviderSecretStatuses,
    splitList,
    joinList,
  };
});
