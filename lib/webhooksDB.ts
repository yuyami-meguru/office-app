import { supabase } from './supabase';
import { getCurrentOfficeId, getCurrentGlobalUser } from './authDB';
import * as crypto from 'crypto';

export type WebhookConfiguration = {
  id: number;
  officeId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  enabled: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
};

export type WebhookDelivery = {
  id: number;
  webhookId: number;
  event: string;
  payload: Record<string, any>;
  responseStatus: number | null;
  responseBody: string | null;
  deliveredAt: string;
  createdAt: string;
};

// Webhook設定一覧を取得
export async function getWebhookConfigurations(): Promise<WebhookConfiguration[]> {
  const officeId = getCurrentOfficeId();
  if (!officeId) return [];

  const { data, error } = await supabase
    .from('webhook_configurations')
    .select('*')
    .eq('office_id', officeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Webhook設定取得エラー:', error);
    return [];
  }

  return (data || []).map(webhook => ({
    id: webhook.id,
    officeId: webhook.office_id,
    name: webhook.name,
    url: webhook.url,
    events: webhook.events || [],
    secret: webhook.secret,
    enabled: webhook.enabled,
    createdBy: webhook.created_by,
    createdAt: webhook.created_at,
    updatedAt: webhook.updated_at,
  }));
}

// Webhook設定を作成
export async function createWebhookConfiguration(
  name: string,
  url: string,
  events: string[]
): Promise<WebhookConfiguration> {
  const officeId = getCurrentOfficeId();
  const user = getCurrentGlobalUser();
  if (!officeId || !user) throw new Error('ログインが必要です');

  // シークレットを生成
  const secret = crypto.randomBytes(32).toString('hex');

  const { data, error } = await supabase
    .from('webhook_configurations')
    .insert([
      {
        office_id: officeId,
        name,
        url,
        events,
        secret,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error('Webhook設定の作成に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    url: data.url,
    events: data.events || [],
    secret: data.secret,
    enabled: data.enabled,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Webhook設定を更新
export async function updateWebhookConfiguration(
  id: number,
  updates: {
    name?: string;
    url?: string;
    events?: string[];
    enabled?: boolean;
  }
): Promise<WebhookConfiguration> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.events !== undefined) updateData.events = updates.events;
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

  const { data, error } = await supabase
    .from('webhook_configurations')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error('Webhook設定の更新に失敗しました');
  }

  return {
    id: data.id,
    officeId: data.office_id,
    name: data.name,
    url: data.url,
    events: data.events || [],
    secret: data.secret,
    enabled: data.enabled,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Webhook設定を削除
export async function deleteWebhookConfiguration(id: number): Promise<void> {
  const { error } = await supabase
    .from('webhook_configurations')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error('Webhook設定の削除に失敗しました');
  }
}

// Webhook送信履歴を取得
export async function getWebhookDeliveries(webhookId: number, limit: number = 50): Promise<WebhookDelivery[]> {
  const { data, error } = await supabase
    .from('webhook_deliveries')
    .select('*')
    .eq('webhook_id', webhookId)
    .order('delivered_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Webhook送信履歴取得エラー:', error);
    return [];
  }

  return (data || []).map(delivery => ({
    id: delivery.id,
    webhookId: delivery.webhook_id,
    event: delivery.event,
    payload: delivery.payload,
    responseStatus: delivery.response_status,
    responseBody: delivery.response_body,
    deliveredAt: delivery.delivered_at,
    createdAt: delivery.created_at,
  }));
}

