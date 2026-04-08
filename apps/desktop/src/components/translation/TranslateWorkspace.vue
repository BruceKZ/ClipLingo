<template>
  <section class="d-flex h-100 min-h-0 flex-column">
    <v-card border rounded="md" class="mb-4 shrink-0">
      <v-card-text class="d-flex flex-column ga-3 md:flex-row md:items-start">
        <v-select
          v-model="selectedSourceLanguage"
          :items="languageOptions"
          item-title="title"
          item-value="value"
          label="输入语言"
          variant="outlined"
          density="comfortable"
          hide-details
          class="w-100 md:max-w-xs"
        />
        <v-select
          v-model="selectedTargetLanguage"
          :items="targetLanguageOptions"
          item-title="title"
          item-value="value"
          label="目标语言"
          variant="outlined"
          density="comfortable"
          hide-details
          class="w-100 md:max-w-xs"
        />
        <div class="d-flex ga-2 shrink-0">
          <v-btn color="primary" :loading="store.loading" @click="translateNow">
            翻译
          </v-btn>
          <v-btn variant="outlined" :disabled="!hasOutput" @click="copyOutput">
            复制
          </v-btn>
        </div>
      </v-card-text>
      <v-card-text v-if="store.error" class="pt-0 text-caption text-error">
        {{ store.error.message }}
      </v-card-text>
    </v-card>

    <v-row class="ma-0 flex-1 min-h-0 gx-2 gy-4">
      <v-col cols="12" md="6" class="pa-0 d-flex min-h-0">
        <v-card
          rounded="md"
          elevation="0"
          class="d-flex min-h-0 flex-1 flex-column border border-slate-200 bg-white"
        >
        <v-card-text class="d-flex min-h-0 flex-1 pa-4">
          <textarea
            v-model="sourceText"
            class="h-full min-h-0 w-full resize-none overflow-y-auto rounded-md border-0 bg-transparent px-4 py-3 text-base leading-7 text-gray-900 outline-none"
            placeholder="Paste text here, or trigger with Cmd/Ctrl+C+C"
          />
        </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" class="pa-0 d-flex min-h-0">
        <v-card
          rounded="md"
          elevation="0"
          class="d-flex min-h-0 flex-1 flex-column border border-slate-200 bg-white"
        >
        <v-card-text class="d-flex min-h-0 flex-1 pa-4">
          <textarea
            :value="outputText"
            readonly
            class="h-full min-h-0 w-full resize-none overflow-y-auto rounded-md border-0 bg-transparent px-4 py-3 text-base leading-7 text-gray-900 outline-none"
          />
        </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useTranslationStore } from "@/stores/translation";

const store = useTranslationStore();

interface LanguageOption {
  title: string;
  value: string;
}

const languageOptions: LanguageOption[] = [
  { title: "自动检测", value: "auto" },
  { title: "English", value: "en" },
  { title: "简体中文", value: "zh-CN" },
  { title: "繁體中文", value: "zh-TW" },
  { title: "日本語", value: "ja" },
  { title: "한국어", value: "ko" },
  { title: "Français", value: "fr" },
  { title: "Deutsch", value: "de" },
  { title: "Español", value: "es" },
  { title: "Русский", value: "ru" },
];

const targetLanguageOptions = computed(() =>
  languageOptions.filter((item) => item.value !== "auto"),
);

const selectedSourceLanguage = ref("auto");
const selectedTargetLanguage = ref("zh-CN");

const sourceText = computed({
  get: () => store.sourceText,
  set: (nextValue: string) => {
    store.sourceText = nextValue;
    store.sourceCharacterCount = nextValue.length;
  },
});

const outputText = computed(() => store.translations[0]?.text ?? "");
const hasOutput = computed(() => outputText.value.trim().length > 0);

async function translateNow() {
  await store.retryTranslation({
    sourceLanguage:
      selectedSourceLanguage.value === "auto"
        ? undefined
        : selectedSourceLanguage.value,
    targetLanguages: [selectedTargetLanguage.value],
  });
}

async function copyOutput() {
  const targetLanguage =
    store.translations[0]?.targetLanguage ?? selectedTargetLanguage.value;
  await store.copyTarget(targetLanguage);
}
</script>
