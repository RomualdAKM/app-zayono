<template>
  <div class="team-page">
    <div class="page-head">
      <p class="page-subtitle">{{ $t('teamPage.subtitle') }}</p>
      <Button :label="$t('teamPage.inviteMember')" icon="pi pi-user-plus" class="primary-btn" disabled />
    </div>

    <!-- Current owner preview, shown as a member card to anchor the layout -->
    <div v-if="currentMerchant" class="card members-card">
      <div class="card-head">
        <div>
          <h3 class="card-title">{{ $t('teamPage.membersTitle') }}</h3>
          <p class="card-subtitle">{{ $t('teamPage.membersSubtitle') }}</p>
        </div>
      </div>

      <ul class="member-list">
        <li class="member-row">
          <div class="member-info">
            <div class="avatar" :style="{ background: avatarBg }">{{ initials }}</div>
            <div class="member-meta">
              <div class="member-name-row">
                <span class="member-name">{{ currentMerchant.name || $t('teamPage.you') }}</span>
                <span class="role-pill role-owner">{{ $t('teamPage.owner') }}</span>
              </div>
              <span class="member-email">{{ currentMerchant.email }}</span>
            </div>
          </div>
          <Button icon="pi pi-ellipsis-h" text rounded size="small" disabled v-tooltip.left="$t('teamPage.comingSoonTooltip')" />
        </li>
      </ul>
    </div>

    <!-- Empty state for the future invitations feature -->
    <div class="card empty-card">
      <div class="empty-state">
        <AppIcon name="users" class="empty-icon" />
        <h3 class="empty-title">{{ $t('teamPage.emptyTitle') }}</h3>
        <p class="empty-text">
          {{ $t('teamPage.emptyText') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore()

const currentMerchant = computed(() => auth.merchant || null)

const initials = computed(() => {
  const name = currentMerchant.value?.name || currentMerchant.value?.email || '?'
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s.charAt(0).toUpperCase())
    .join('') || '?'
})

// Subtle blue circle background for the avatar
const avatarBg = '#EEF4FF'
</script>

<style scoped>
.team-page {
  background: transparent;
  min-height: 100%;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.page-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
  max-width: 640px;
}

.primary-btn :deep(.p-button),
.primary-btn {
  background: var(--ze-brand) !important;
  border-color: var(--ze-brand) !important;
  color: #FFFFFF !important;
  border-radius: 6px !important;
}

.primary-btn:hover :deep(.p-button),
.primary-btn:hover {
  background: var(--ze-brand-hover) !important;
  border-color: var(--ze-brand-hover) !important;
}

.card {
  background: var(--ze-bg-card);
  border: 1px solid var(--ze-border);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--ze-text-strong);
  margin: 0 0 4px;
  letter-spacing: -0.01em;
}

.card-subtitle {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
}

/* Member list */
.member-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 6px;
  transition: background 0.15s;
}

.member-row:hover {
  background: var(--ze-bg-subtle);
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--ze-brand-hover);
  flex-shrink: 0;
}

.member-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.member-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ze-text-strong);
}

.member-email {
  font-size: 12px;
  color: var(--ze-text-muted);
}

/* Role pills */
.role-pill {
  display: inline-flex;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.role-owner {
  background: var(--ze-brand-bg-soft);
  color: var(--ze-brand-hover);
}

.role-member {
  background: var(--ze-bg-hover);
  color: var(--ze-text-label);
}

/* Empty state */
.empty-card {
  padding: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 24px;
}

.empty-icon {
  font-size: 2rem;
  color: var(--ze-text-disabled);
  margin-bottom: 12px;
}

.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ze-text-label);
  margin: 0 0 8px;
}

.empty-text {
  font-size: 13px;
  color: var(--ze-text-muted);
  margin: 0;
  max-width: 480px;
  line-height: 1.6;
}

@media (max-width: 480px) {
  .member-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .member-row > :deep(.p-button) {
    align-self: flex-end;
  }

  .member-name-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
