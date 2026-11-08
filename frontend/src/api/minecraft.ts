import { apiGet, apiSend } from '@/api/http'
import type { Locale } from '@/i18n'

/** The owner's Minecraft server (backend routes/minecraft) and the visitor's nickname on it. */
export interface MinecraftServer {
  address: string
  /** The vanilla version to pick in TLauncher (the server's mods are server-only). */
  version: string
  /** How long a confirmed address gets in without asking. */
  trustDays: number
}

export interface MinecraftAccount {
  nickname: string
  /** Addresses confirmed with "It's me" in the bot, last used first. */
  addresses: { ip: string; lastUsedAt: string }[]
}

export interface MinecraftState {
  server: MinecraftServer
  account: MinecraftAccount | null
}

export const fetchMinecraft = () => apiGet<MinecraftState>('/minecraft/me')

/** Claims the nickname, or renames the claimed one. 409 when someone else has it. */
export const saveNickname = (nickname: string, language: Locale) =>
  apiSend<{ account: MinecraftAccount }>('PUT', '/minecraft/account', { nickname, language })

export const deleteAccount = () => apiSend<{ account: null }>('DELETE', '/minecraft/account')

export const forgetAddresses = () =>
  apiSend<{ account: MinecraftAccount }>('DELETE', '/minecraft/account/addresses')
