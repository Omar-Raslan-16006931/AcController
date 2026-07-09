/**
 * Hand-written types mirroring `database/schema.sql`.
 *
 * Once the schema is applied to your Supabase project, you can regenerate
 * this file from the live schema with:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
 *
 * Keeping a hand-written version in sync means the app compiles end-to-end
 * without a network round-trip to Supabase during development.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ThemePreference = "light" | "dark" | "system"
// Restricted to exactly what the real Carrier hardware supports: no
// fan-only mode, no auto fan speed. "eco" confirmed via a clean IR
// recapture -- see backend/app/services/carrier_ac.py's FAN_CODES.
export type AcMode = "cool" | "heat" | "dry"
export type FanSpeed = "eco" | "low" | "medium" | "high"
export type RepeatRule = "once" | "daily" | "weekdays" | "weekends" | "custom"
export type CommandSource = "manual" | "schedule" | "timer" | "system"
export type CommandResult = "success" | "failure"
export type TimerAction = "turn_off" | "turn_on"
export type TimerStatus = "pending" | "completed" | "cancelled"

export interface ScheduleAction {
  power: boolean
  temperature?: number
  mode?: AcMode
  fan?: FanSpeed
}

export interface Database {
  public: {
    Tables: {
      settings: {
        Row: {
          id: string
          user_id: string
          theme: ThemePreference
          timezone: string
          language: string
          default_temperature: number
          default_mode: AcMode
          default_fan: FanSpeed
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["settings"]["Row"]> & {
          user_id: string
        }
        Update: Partial<Database["public"]["Tables"]["settings"]["Row"]>
        Relationships: []
      }
      schedules: {
        Row: {
          id: string
          user_id: string
          name: string
          enabled: boolean
          time: string
          repeat: RepeatRule
          custom_days: number[]
          run_date: string | null
          action: Json
          last_run_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["schedules"]["Row"]> & {
          user_id: string
          name: string
          time: string
          repeat: RepeatRule
          action: Json
        }
        Update: Partial<Database["public"]["Tables"]["schedules"]["Row"]>
        Relationships: []
      }
      timers: {
        Row: {
          id: string
          user_id: string
          label: string
          action: TimerAction
          fires_at: string
          status: TimerStatus
          created_at: string
          completed_at: string | null
        }
        Insert: Partial<Database["public"]["Tables"]["timers"]["Row"]> & {
          user_id: string
          action: TimerAction
          fires_at: string
        }
        Update: Partial<Database["public"]["Tables"]["timers"]["Row"]>
        Relationships: []
      }
      command_history: {
        Row: {
          id: string
          user_id: string
          power: boolean
          temperature: number | null
          mode: AcMode | null
          fan: FanSpeed | null
          source: CommandSource
          result: CommandResult
          error: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["command_history"]["Row"]> & {
          user_id: string
          power: boolean
          source: CommandSource
          result: CommandResult
        }
        Update: Partial<Database["public"]["Tables"]["command_history"]["Row"]>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
