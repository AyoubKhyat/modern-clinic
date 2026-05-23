"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { patientsApi } from "@/lib/api"
import type { Patient } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PatientFormProps {
  patient?: Patient
  onSuccess: () => void
  onCancel: () => void
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
const GENDERS = ["Male", "Female", "Other"]

export function PatientForm({ patient, onSuccess, onCancel }: PatientFormProps) {
  const isEdit = !!patient

  const [form, setForm] = useState({
    first_name: patient?.first_name ?? "",
    last_name: patient?.last_name ?? "",
    phone: patient?.phone ?? "",
    email: patient?.email ?? "",
    date_of_birth: patient?.date_of_birth ?? "",
    gender: patient?.gender ?? "",
    blood_type: patient?.blood_type ?? "",
    address: patient?.address ?? "",
    allergies: patient?.allergies ?? "",
    emergency_contact_name: patient?.emergency_contact_name ?? "",
    emergency_contact_phone: patient?.emergency_contact_phone ?? "",
    notes: patient?.notes ?? "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => ({ ...prev, [field]: "" }))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.first_name.trim()) errs.first_name = "First name is required"
    if (!form.last_name.trim()) errs.last_name = "Last name is required"
    if (!form.phone.trim()) errs.phone = "Phone number is required"
    else if (!/^[+\d\s()-]{7,}$/.test(form.phone)) errs.phone = "Invalid phone format"
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address"
    if (form.emergency_contact_phone && !/^[+\d\s()-]{7,}$/.test(form.emergency_contact_phone)) errs.emergency_contact_phone = "Invalid phone format"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!validate()) return
    setLoading(true)

    try {
      if (isEdit) {
        await patientsApi.update(patient.id, form)
      } else {
        await patientsApi.create(form)
      }
      onSuccess()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.errors
          ? Object.values(err?.response?.data?.errors ?? {})
              .flat()
              .join(", ")
          : "Something went wrong. Please try again."
      setError(msg || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
            className={`h-9 ${fieldErrors.first_name ? "ring-2 ring-red-500/50" : ""}`}
          />
          {fieldErrors.first_name && <span className="text-xs text-red-500">{fieldErrors.first_name}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
            className={`h-9 ${fieldErrors.last_name ? "ring-2 ring-red-500/50" : ""}`}
          />
          {fieldErrors.last_name && <span className="text-xs text-red-500">{fieldErrors.last_name}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={`h-9 ${fieldErrors.phone ? "ring-2 ring-red-500/50" : ""}`}
          />
          {fieldErrors.phone && <span className="text-xs text-red-500">{fieldErrors.phone}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={`h-9 ${fieldErrors.email ? "ring-2 ring-red-500/50" : ""}`}
          />
          {fieldErrors.email && <span className="text-xs text-red-500">{fieldErrors.email}</span>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="date_of_birth">Date of Birth</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={form.date_of_birth}
            onChange={(e) => update("date_of_birth", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Gender</Label>
          <Select value={form.gender} onValueChange={(v) => update("gender", v ?? "")}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Blood Type</Label>
          <Select
            value={form.blood_type}
            onValueChange={(v) => update("blood_type", v ?? "")}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select blood type" />
            </SelectTrigger>
            <SelectContent>
              {BLOOD_TYPES.map((bt) => (
                <SelectItem key={bt} value={bt}>
                  {bt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
          <Input
            id="emergency_contact_name"
            value={form.emergency_contact_name}
            onChange={(e) => update("emergency_contact_name", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
          <Input
            id="emergency_contact_phone"
            value={form.emergency_contact_phone}
            onChange={(e) => update("emergency_contact_phone", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="allergies">Allergies</Label>
        <Textarea
          id="allergies"
          value={form.allergies}
          onChange={(e) => update("allergies", e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Update Patient"
          ) : (
            "Create Patient"
          )}
        </Button>
      </div>
    </form>
  )
}
