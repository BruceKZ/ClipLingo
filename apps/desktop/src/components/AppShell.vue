<template>
  <v-app :theme="uiStore.resolvedTheme">
    <v-navigation-drawer
      :rail="rail"
      permanent
      border="end"
      :width="180"
      :rail-width="76"
    >
      <div class="d-flex justify-center px-3 pt-4 pb-3">
        <div class="nav-brand" :class="{ 'nav-brand--rail': rail }">
          <img :src="appIcon" alt="ClipLingo" class="nav-brand__image" />
          <div v-if="!rail" class="nav-brand__label">ClipLingo</div>
        </div>
      </div>

      <v-list nav density="comfortable" class="pt-0">
        <v-list-item
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :active="route.path === item.to"
          rounded="lg"
          class="mx-2 mb-2"
          color="primary"
        >
          <template #prepend>
            <v-icon :icon="item.icon" />
          </template>
          <v-list-item-title class="nav-label">{{ item.label }}</v-list-item-title>
        </v-list-item>
      </v-list>

      <template #append>
        <v-list nav density="comfortable" class="pb-3">
          <v-list-item
            rounded="lg"
            class="mx-2 mb-2"
            @click="toggleTheme"
          >
            <template #prepend>
              <v-icon :icon="themeIcon" />
            </template>
            <v-list-item-title v-if="!rail" class="nav-label">{{ themeLabel }}</v-list-item-title>
          </v-list-item>

          <v-list-item
            rounded="lg"
            class="mx-2"
            @click="toggleRail"
          >
            <template #prepend>
              <v-icon :icon="rail ? 'mdi-dock-right' : 'mdi-dock-left'" />
            </template>
            <v-list-item-title v-if="!rail" class="nav-label">
              {{ t("nav.toggleSidebar") }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <v-main class="bg-background">
      <v-container fluid class="pa-4 pa-md-6 fill-height">
        <div :class="contentShellClass">
          <RouterView />
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { listen } from "@tauri-apps/api/event";
import { RouterView, useRoute } from "vue-router";
import appIcon from "@/assets/app-icon.png";
import { useUiStore } from "@/stores/ui";
import { useTranslationStore } from "@/stores/translation";
import { useI18n } from "@/i18n";
import {
  TRANSLATION_TRIGGER_EVENT,
  type TranslationTriggerPayload,
} from "@/components/translation/types";
import { router } from "@/router";

const uiStore = useUiStore();
const translationStore = useTranslationStore();
const route = useRoute();
const { t } = useI18n();
const rail = ref(false);
let unlistenTrigger: (() => void) | null = null;

const navItems = computed(() => [
  { label: t("nav.translate"), to: "/", icon: "mdi-translate" },
  { label: t("nav.settings"), to: "/settings", icon: "mdi-cog-outline" },
  { label: t("nav.providers"), to: "/providers", icon: "mdi-database-cog-outline" },
]);

const contentShellClass = computed(() =>
  route.path === "/"
    ? "w-100 h-100 d-flex flex-column"
    : "app-content-shell mx-auto w-100",
);
const themeLabel = computed(() =>
  uiStore.resolvedTheme === "dark" ? t("nav.themeDark") : t("nav.themeLight"),
);
const themeIcon = computed(() =>
  uiStore.resolvedTheme === "dark" ? "mdi-weather-night" : "mdi-white-balance-sunny",
);

function toggleTheme() {
  const nextTheme = uiStore.resolvedTheme === "dark" ? "light" : "dark";
  uiStore.applyTheme(nextTheme);
}

function toggleRail() {
  rail.value = !rail.value;
}

onMounted(async () => {
  unlistenTrigger = await listen<TranslationTriggerPayload>(
    TRANSLATION_TRIGGER_EVENT,
    async (event) => {
      console.info(
        "[trigger] frontend received translation event",
        event.payload.source,
        event.payload.characterCount,
      );
      if (router.currentRoute.value.path !== "/") {
        await router.push("/");
      }
      await translationStore.handleTrigger(event.payload);
    },
  );
});

onBeforeUnmount(() => {
  unlistenTrigger?.();
});
</script>

<style scoped>
.app-content-shell {
  max-width: 920px;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 96px;
  min-height: 88px;
  border-radius: 20px;
}

.nav-brand--rail {
  width: 52px;
  height: 52px;
  border-radius: 16px;
}

.nav-brand__label {
  font-size: 0.95rem;
  line-height: 1.1;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.nav-brand__image {
  display: block;
  width: 48px;
  height: 48px;
  object-fit: contain;
}

.nav-brand--rail .nav-brand__image {
  width: 36px;
  height: 36px;
}
</style>
