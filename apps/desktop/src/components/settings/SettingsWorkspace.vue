<template>
  <v-sheet color="transparent" :class="compact ? 'pa-1' : ''">
    <v-alert
      v-if="settings.initializing && !showWorkspace"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      {{ t("settings.loading") }}
    </v-alert>
    <v-alert
      v-else-if="settings.testState === 'running'"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      {{ t("settings.statusTesting") }}
    </v-alert>
    <v-alert
      v-else-if="settings.persistState === 'saving'"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      {{ t("settings.statusSaving") }}
    </v-alert>
    <v-alert
      v-else-if="topWarningMessage"
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      {{ topWarningMessage }}
    </v-alert>

    <v-card border rounded="lg" class="mb-4">
      <v-card-title>{{ t("settings.title") }}</v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="8">
            <div class="text-body-2 mb-1">{{ t("settings.activeProvider") }}</div>
            <v-select
              v-model="providerSelection"
              :items="providerOptions"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn
              v-if="!compact"
              variant="outlined"
              block
              @click="goToProviderManager"
            >
              {{ t("settings.manageProviders") }}
            </v-btn>
          </v-col>
        </v-row>

        <v-row dense class="mt-2">
          <v-col cols="12" md="4">
            <v-btn
              block
              variant="outlined"
              :loading="settings.persistState === 'saving'"
              @click="handleSave"
            >
              {{
                settings.persistState === "saving"
                  ? t("settings.saving")
                  : t("settings.save")
              }}
            </v-btn>
          </v-col>
          <v-col cols="12" md="4">
            <v-btn
              block
              color="primary"
              :loading="settings.testState === 'running'"
              @click="settings.testConnection"
            >
              {{
                settings.testState === "running"
                  ? t("settings.testing")
                  : t("settings.testTranslation")
              }}
            </v-btn>
          </v-col>
          <v-col cols="12" md="4">
            <v-btn block color="primary" variant="tonal" @click="settings.resetAll">
              {{ t("settings.resetDefaults") }}
            </v-btn>
          </v-col>
        </v-row>

        <v-divider class="my-4" />

        <div class="text-caption text-medium-emphasis">
          {{ statusText }}
        </div>
      </v-card-text>
    </v-card>

    <template v-if="showWorkspace">
      <v-row dense class="mb-4">
      <v-col cols="12" lg="6">
        <v-card border rounded="lg" class="h-100">
          <v-card-title>{{ t("settings.general") }}</v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-select
                  v-model="themeMode"
                  :label="t('settings.themeMode')"
                  :items="themeModeItems"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="locale"
                  :label="t('settings.language')"
                  :items="localeItems"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="settings.draft.ui.showTrayIcon"
                  :label="t('settings.showTrayIcon')"
                  color="primary"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" lg="6">
        <v-card border rounded="lg" class="h-100">
          <v-card-title>{{ t("settings.trigger") }}</v-card-title>
          <v-card-text>
            <v-row dense>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="settings.draft.trigger.doubleCopyWindowMs"
                  type="text"
                  inputmode="numeric"
                  :label="t('settings.doubleCopyWindowMs')"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :error-messages="settings.validation.trigger.doubleCopyWindowMs.valid ? [] : [settings.validation.trigger.doubleCopyWindowMs.message ?? 'Invalid value']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.trim="settings.draft.trigger.fallbackShortcut"
                  :label="t('settings.fallbackShortcut')"
                  placeholder="CmdOrCtrl+Shift+Y"
                  autocomplete="off"
                  autocapitalize="off"
                  autocorrect="off"
                  :spellcheck="false"
                  variant="outlined"
                  density="comfortable"
                  hide-details="auto"
                  :error-messages="settings.validation.trigger.fallbackShortcut.valid ? [] : [settings.validation.trigger.fallbackShortcut.message ?? 'Invalid shortcut']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="settings.draft.trigger.replacePopupOnNewTrigger"
                  :label="t('settings.replacePopupOnNewTrigger')"
                  color="primary"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card border rounded="lg" class="mb-4">
      <v-card-title>{{ t("settings.languageRouting") }}</v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-select
              v-model="routingKind"
              :label="t('settings.routingMode')"
              :items="routingModeItems"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <v-row v-if="routingKind === 'branching'" dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.trim="branchingEnglishSourceText"
              :label="t('settings.englishSource')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="branchingEnglishTargetsText"
              :label="t('settings.englishTargets')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.trim="branchingChineseSourceText"
              :label="t('settings.chineseSource')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="branchingChineseTargetsText"
              :label="t('settings.chineseTargets')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="branchingFallbackTargetsText"
              :label="t('settings.fallbackTargets')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <v-row v-else-if="routingKind === 'bidirectional'" dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.trim="bidirectionalPrimarySourceText"
              :label="t('settings.primarySource')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="bidirectionalPrimaryTargetsText"
              :label="t('settings.primaryTargets')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model.trim="bidirectionalSecondarySourceText"
              :label="t('settings.secondarySource')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="bidirectionalSecondaryTargetsText"
              :label="t('settings.secondaryTargets')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <v-row v-else dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="fixedTargetLanguagesText"
              :label="t('settings.targetLanguages')"
              variant="outlined"
              density="comfortable"
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <v-row dense class="mt-1">
          <v-col cols="12" md="6">
            <v-textarea
              v-model.trim="userRulesText"
              :label="t('settings.userTranslationRules')"
              rows="2"
              variant="outlined"
              density="comfortable"
              :auto-grow="false"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6" class="d-flex align-center">
            <v-switch
              v-model="settings.draft.translation.preserveParagraphs"
              :label="t('settings.preserveParagraphs')"
              color="primary"
              hide-details
            />
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card border rounded="lg">
      <v-card-title>{{ t("settings.privacy") }}</v-card-title>
      <v-card-text>
        <v-switch v-model="settings.draft.history.enabled" :label="t('settings.enableLocalHistory')" color="primary" hide-details />
        <v-text-field
          v-model.number="settings.draft.history.maxItems"
          type="text"
          inputmode="numeric"
          min="1"
          max="5000"
          step="1"
          :label="t('settings.historyLimit')"
          variant="outlined"
          density="comfortable"
          hide-details="auto"
          class="mt-2"
          :error-messages="settings.validation.history.maxItems.valid ? [] : [settings.validation.history.maxItems.message ?? 'Invalid value']"
        />
        <v-switch v-model="settings.draft.history.storeFullText" :label="t('settings.storeFullTextInHistory')" color="primary" hide-details />
        <v-switch v-model="settings.draft.debug.logRawNetworkErrors" :label="t('settings.logRawNetworkErrors')" color="primary" hide-details />
      </v-card-text>
    </v-card>
    </template>

    <v-row v-else dense>
      <v-col cols="12" lg="6">
        <v-card border rounded="lg" class="h-100">
          <v-card-title>{{ t("settings.general") }}</v-card-title>
          <v-card-text>
            <v-skeleton-loader type="article, article" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" lg="6">
        <v-card border rounded="lg" class="h-100">
          <v-card-title>{{ t("settings.trigger") }}</v-card-title>
          <v-card-text>
            <v-skeleton-loader type="article, article" />
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12">
        <v-card border rounded="lg">
          <v-card-title>{{ t("settings.languageRouting") }}</v-card-title>
          <v-card-text>
            <v-skeleton-loader type="article, article, article" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/i18n";
import { useSettingsStore } from "@/stores/settings";
import { useUiStore, type AppLocale } from "@/stores/ui";
import type { RoutingKind, ThemeMode } from "@/types";

const { compact = false } = defineProps<{
  compact?: boolean;
}>();

const settings = useSettingsStore();
const uiStore = useUiStore();
const router = useRouter();
const { t } = useI18n();
const showWorkspace = ref(false);

onMounted(() => {
  void nextTick(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    showWorkspace.value = true;
    settings.initialize({ timeoutMs: 1_500 }).catch(() => undefined);
  });
});

const providerOptions = computed(() =>
  settings.providers.map((provider) => ({
    title: provider.name || provider.id,
    value: provider.id,
  })),
);

const providerSelection = computed<string | null>({
  get: () => settings.selectedProviderId,
  set: (value) => {
    if (!value) {
      return;
    }
    settings.makeProviderActive(value);
  },
});

const selectedProvider = computed(() => {
  if (!settings.selectedProviderId) {
    return settings.providers[0] ?? null;
  }
  return (
    settings.providers.find(
      (provider) => provider.id === settings.selectedProviderId,
    ) ?? settings.providers[0] ?? null
  );
});

const themeMode = computed<ThemeMode>({
  get: () => settings.draft.ui.themeMode,
  set: (nextTheme) => {
    settings.draft.ui.themeMode = nextTheme;
    uiStore.applyTheme(nextTheme);
  },
});

const locale = computed<AppLocale>({
  get: () => uiStore.locale,
  set: (nextLocale) => {
    uiStore.applyLocale(nextLocale);
  },
});

const themeModeItems = computed(() => [
  {
    title: uiStore.locale === "zh-CN" ? "跟随系统" : "System",
    value: "system",
  },
  { title: uiStore.locale === "zh-CN" ? "浅色" : "Light", value: "light" },
  { title: uiStore.locale === "zh-CN" ? "深色" : "Dark", value: "dark" },
]);

const localeItems = [
  { title: "English", value: "en" },
  { title: "简体中文", value: "zh-CN" },
];

const routingModeItems = computed(() => [
  {
    title: uiStore.locale === "zh-CN" ? "分支路由" : "Branching",
    value: "branching",
  },
  {
    title: uiStore.locale === "zh-CN" ? "双向路由" : "Bidirectional",
    value: "bidirectional",
  },
  { title: uiStore.locale === "zh-CN" ? "固定目标" : "Fixed", value: "fixed" },
]);

const routingKind = computed<RoutingKind>({
  get: () => settings.draft.translation.routingRule.kind,
  set: (nextKind) => {
    settings.setRoutingKind(nextKind);
  },
});

function listField(
  getter: () => readonly string[],
  setter: (next: string[]) => void,
) {
  return computed({
    get: () => settings.joinList(getter()),
    set: (nextValue: string) => {
      setter(settings.splitList(nextValue));
    },
  });
}

const userRulesText = computed<string>({
  get: () => settings.draft.translation.userRules ?? "",
  set: (nextRules) => {
    settings.draft.translation.userRules = nextRules;
  },
});

const branchingEnglishSourceText = computed<string>({
  get: () =>
    settings.draft.translation.routingRule.kind === "branching"
      ? settings.draft.translation.routingRule.englishSourceLanguage
      : "",
  set: (nextValue) => {
    if (settings.draft.translation.routingRule.kind === "branching") {
      settings.draft.translation.routingRule.englishSourceLanguage = nextValue;
    }
  },
});

const branchingEnglishTargetsText = listField(
  () =>
    settings.draft.translation.routingRule.kind === "branching"
      ? settings.draft.translation.routingRule.englishTargetLanguages
      : [],
  (next) => {
    if (settings.draft.translation.routingRule.kind === "branching") {
      settings.draft.translation.routingRule.englishTargetLanguages = next;
    }
  },
);

const branchingChineseSourceText = computed<string>({
  get: () =>
    settings.draft.translation.routingRule.kind === "branching"
      ? settings.draft.translation.routingRule.chineseSourceLanguage
      : "",
  set: (nextValue) => {
    if (settings.draft.translation.routingRule.kind === "branching") {
      settings.draft.translation.routingRule.chineseSourceLanguage = nextValue;
    }
  },
});

const branchingChineseTargetsText = listField(
  () =>
    settings.draft.translation.routingRule.kind === "branching"
      ? settings.draft.translation.routingRule.chineseTargetLanguages
      : [],
  (next) => {
    if (settings.draft.translation.routingRule.kind === "branching") {
      settings.draft.translation.routingRule.chineseTargetLanguages = next;
    }
  },
);

const branchingFallbackTargetsText = listField(
  () =>
    settings.draft.translation.routingRule.kind === "branching"
      ? settings.draft.translation.routingRule.fallbackTargetLanguages
      : [],
  (next) => {
    if (settings.draft.translation.routingRule.kind === "branching") {
      settings.draft.translation.routingRule.fallbackTargetLanguages = next;
    }
  },
);

const bidirectionalPrimarySourceText = computed<string>({
  get: () =>
    settings.draft.translation.routingRule.kind === "bidirectional"
      ? settings.draft.translation.routingRule.primarySourceLanguage
      : "",
  set: (nextValue) => {
    if (settings.draft.translation.routingRule.kind === "bidirectional") {
      settings.draft.translation.routingRule.primarySourceLanguage = nextValue;
    }
  },
});

const bidirectionalPrimaryTargetsText = listField(
  () =>
    settings.draft.translation.routingRule.kind === "bidirectional"
      ? settings.draft.translation.routingRule.primaryTargetLanguages
      : [],
  (next) => {
    if (settings.draft.translation.routingRule.kind === "bidirectional") {
      settings.draft.translation.routingRule.primaryTargetLanguages = next;
    }
  },
);

const bidirectionalSecondarySourceText = computed<string>({
  get: () =>
    settings.draft.translation.routingRule.kind === "bidirectional"
      ? settings.draft.translation.routingRule.secondarySourceLanguage
      : "",
  set: (nextValue) => {
    if (settings.draft.translation.routingRule.kind === "bidirectional") {
      settings.draft.translation.routingRule.secondarySourceLanguage = nextValue;
    }
  },
});

const bidirectionalSecondaryTargetsText = listField(
  () =>
    settings.draft.translation.routingRule.kind === "bidirectional"
      ? settings.draft.translation.routingRule.secondaryTargetLanguages
      : [],
  (next) => {
    if (settings.draft.translation.routingRule.kind === "bidirectional") {
      settings.draft.translation.routingRule.secondaryTargetLanguages = next;
    }
  },
);

const fixedTargetLanguagesText = listField(
  () =>
    settings.draft.translation.routingRule.kind === "fixed"
      ? settings.draft.translation.routingRule.targetLanguages
      : [],
  (next) => {
    if (settings.draft.translation.routingRule.kind === "fixed") {
      settings.draft.translation.routingRule.targetLanguages = next;
    }
  },
);

const topWarningMessage = computed(() => {
  if (settings.persistState === "error" && settings.persistError) {
    return settings.persistError;
  }
  if (settings.testState === "error" && settings.testMessage) {
    return settings.testMessage;
  }

  const provider = selectedProvider.value;
  if (!provider) {
    return t("settings.noProvider");
  }

  if (!provider.baseUrl.trim()) {
    return "Provider base URL is required.";
  }

  if (!provider.model.trim()) {
    return "Model name is required.";
  }

  if (
    provider.authScheme === "bearer" &&
    !provider.apiKeyDraft.trim() &&
    !settings.hasProviderSecret(provider.id)
  ) {
    return "API key is required for bearer auth.";
  }

  if (settings.hasUnsavedChanges) {
    return "You have unsaved settings.";
  }

  return null;
});

const statusText = computed(() => {
  const status = settings.statusLine;
  if (!status) {
    return "";
  }
  const timestamp = new Date(status.at).toLocaleTimeString();
  return `${t("settings.statusAt")}: ${timestamp} · ${status.message}`;
});

async function handleSave() {
  await settings.persist();
}

function goToProviderManager() {
  router.push("/providers").catch(() => undefined);
}
</script>
