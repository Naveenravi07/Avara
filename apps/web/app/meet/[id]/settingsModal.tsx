"use client"

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function SettingsModal({
    open = false,
    onOpenChange,
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
}) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark bg-black border-zinc-800 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Settings</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="join-toggle" className="text-white">
              Anyone can join
            </Label>
            <Switch id="join-toggle" className="data-[state=checked]:bg-white data-[state=checked]:border-white" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="microphone" className="text-white">
              Microphone Input
            </Label>
            <Select>
              <SelectTrigger id="microphone" className="border-zinc-800 bg-black text-white">
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem
                  value="default"
                  className="text-white focus:bg-zinc-800 focus:text-white hover:bg-zinc-800 hover:text-white"
                >
                  Default Microphone
                </SelectItem>
                <SelectItem
                  value="built-in"
                  className="text-white focus:bg-zinc-800 focus:text-white hover:bg-zinc-800 hover:text-white"
                >
                  Built-in Microphone
                </SelectItem>
                <SelectItem
                  value="external"
                  className="text-white focus:bg-zinc-800 focus:text-white hover:bg-zinc-800 hover:text-white"
                >
                  External Microphone
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="camera" className="text-white">
              Camera Input
            </Label>
            <Select>
              <SelectTrigger id="camera" className="border-zinc-800 bg-black text-white">
                <SelectValue placeholder="Select camera" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem
                  value="default"
                  className="text-white focus:bg-zinc-800 focus:text-white hover:bg-zinc-800 hover:text-white"
                >
                  Default Camera
                </SelectItem>
                <SelectItem
                  value="built-in"
                  className="text-white focus:bg-zinc-800 focus:text-white hover:bg-zinc-800 hover:text-white"
                >
                  Built-in Camera
                </SelectItem>
                <SelectItem
                  value="external"
                  className="text-white focus:bg-zinc-800 focus:text-white hover:bg-zinc-800 hover:text-white"
                >
                  External Camera
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


