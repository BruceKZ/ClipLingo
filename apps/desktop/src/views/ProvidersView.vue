<template>
  <section class="providers-directory">
    <div class="directory-header">
      <div>
        <h1 class="text-h5 mb-1">{{ t("nav.providers") }}</h1>
        <p class="text-body-2 text-medium-emphasis">
          {{ t("settings.providersDirectoryHelp") }}
        </p>
      </div>
      <v-btn class="app-btn" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="handleAddProvider">
        {{ t("settings.addProvider") }}
      </v-btn>
    </div>

    <div class="directory-list">
      <v-card
        v-for="provider in providersStore.providers"
        :key="provider.id"
        variant="outlined"
        rounded="lg"
        class="provider-directory-card"
      >
        <v-card-item>
          <template #prepend>
            <div class="provider-badge">
              {{ provider.name.slice(0, 1).toUpperCase() }}
            </div>
          </template>
          <v-card-title>{{ provider.name || t("settings.unnamedProvider") }}</v-card-title>
          <v-card-subtitle>{{ provider.baseUrl || provider.model || t("settings.providerCardFallback") }}</v-card-subtitle>
          <template #append>
            <div class="d-flex align-center ga-2 flex-wrap justify-end">
              <v-chip
                v-if="provider.id === providersStore.activeProviderId"
                size="small"
                color="primary"
                variant="tonal"
              >
                {{ t("settings.activeProvider") }}
              </v-chip>
              <v-chip size="small" variant="outlined">
                {{ provider.kind }}
              </v-chip>
            </div>
          </template>
        </v-card-item>

        <v-divider />

        <v-card-text>
          <v-row dense>
            <v-col cols="12" md="6">
              <div class="meta-label">{{ t("settings.model") }}</div>
              <div class="meta-value">{{ provider.model || "-" }}</div>
            </v-col>
            <v-col cols="12" md="6">
              <div class="meta-label">{{ t("settings.authScheme") }}</div>
              <div class="meta-value">{{ provider.authScheme }}</div>
            </v-col>
          </v-row>
        </v-card-text>

        <v-divider />

        <v-card-actions class="px-4 py-4">
          <div class="d-flex ga-2 flex-wrap justify-end w-100">
            <v-btn class="app-btn" color="primary" variant="tonal" prepend-icon="mdi-content-copy" @click="duplicateProvider(provider.id)">
              {{ t("settings.duplicate") }}
            </v-btn>
            <v-btn class="app-btn" color="primary" variant="tonal" prepend-icon="mdi-pencil-outline" @click="openProvider(provider.id)">
              {{ t("settings.edit") }}
            </v-btn>
          </div>
        </v-card-actions>
      </v-card>

      <v-card
        v-if="providersStore.providers.length === 0"
        variant="outlined"
        rounded="lg"
        class="provider-directory-card empty-card"
      >
        <v-card-text class="py-12 text-center">
          <div class="text-body-1 mb-2">{{ t("settings.noProvidersYet") }}</div>
          <div class="text-body-2 text-medium-emphasis mb-6">
            {{ t("settings.providersDirectoryEmpty") }}
          </div>
          <v-btn class="app-btn" color="primary" variant="tonal" prepend-icon="mdi-plus" @click="handleAddProvider">
            {{ t("settings.addProvider") }}
          </v-btn>
        </v-card-text>
      </v-card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "@/i18n";
import { useProvidersStore } from "@/stores/providers";

const router = useRouter();
const providersStore = useProvidersStore();
const { t } = useI18n();

onMounted(() => {
  providersStore.refresh(true).catch(() => undefined);
});

function openProvider(providerId: string) {
  providersStore.selectProvider(providerId);
  router.push({ name: "provider-detail", params: { providerId } }).catch(() => undefined);
}

function handleAddProvider() {
  const providerId = providersStore.addProvider();
  router.push({ name: "provider-detail", params: { providerId } }).catch(() => undefined);
}

function duplicateProvider(providerId: string) {
  const nextId = providersStore.duplicateProvider(providerId);
  if (nextId) {
    router.push({ name: "provider-detail", params: { providerId: nextId } }).catch(() => undefined);
  }
}
</script>

<style scoped>
.providers-directory {
  display: grid;
  gap: 24px;
}

.directory-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.directory-list {
  display: grid;
  gap: 16px;
}

.provider-directory-card {
  border-color: var(--color-line);
  cursor: pointer;
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.provider-directory-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.provider-badge {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-accent-soft) 82%, var(--color-panel) 18%);
  color: var(--color-accent);
  font-weight: 700;
}

.meta-label {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.35;
  color: var(--color-muted);
  margin-bottom: 6px;
}

.meta-value {
  font-size: 0.98rem;
  line-height: 1.45;
  color: var(--color-text);
}

.providers-directory :deep(.app-btn) {
  min-height: 42px;
  min-width: 112px;
  text-transform: none;
  font-weight: 600;
  font-size: 0.92rem;
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
}

.providers-directory :deep(.app-btn .v-icon) {
  font-size: 1rem;
}

.empty-card {
  cursor: default;
}

.empty-card:hover {
  border-color: var(--color-line);
  transform: none;
}
</style>
