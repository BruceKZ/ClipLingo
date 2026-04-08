<template>
  <section class="settings-page">
    <div class="settings-shell">
      <div class="settings-header">
        <div>
          <h1 class="text-h5 mb-1">{{ t("settings.title") }}</h1>
        </div>
        <v-btn class="app-btn header-action-btn" color="primary" variant="tonal" prepend-icon="mdi-server-outline" to="/providers">
          {{ t("settings.manageProviders") }}
        </v-btn>
      </div>

      <ProviderOverviewPanel />
    </div>
  </section>
</template>

<script setup lang="ts">
import ProviderOverviewPanel from "@/components/settings/ProviderOverviewPanel.vue";
import { useI18n } from "@/i18n";

const { t } = useI18n();
</script>

<style scoped>
.settings-page {
  display: grid;
  gap: 24px;
}

.settings-shell {
  display: grid;
  gap: 24px;
}

.settings-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.settings-page :deep(.app-btn) {
  min-height: 40px;
  min-width: 112px;
  text-transform: none;
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

.settings-page :deep(.app-btn .v-icon) {
  font-size: 1rem;
}

.settings-page :deep(.header-action-btn) {
  min-width: 156px;
}
</style>
