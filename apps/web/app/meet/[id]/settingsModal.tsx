import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useEffect, useState } from "react"
import { toast } from "@/hooks/use-toast"

export default function SettingsModal({
    open = false,
    onOpenChange,
    meetId
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    meetId: string
}) {
    const [meetDetails, setMeetDetails] = useState<any>(null)
    const [isUpdating, setIsUpdating] = useState(false)

    const fetchMeetDetails = async () => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/meet/${meetId}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            })
            const data = await response.json()
            console.log(data)
            setMeetDetails(data)
        } catch (error) {
            toast({
                title: "Failed to fetch meet details",
                variant: "destructive"
            })
        }
    }

    const handleInviteOnlyToggle = async (checked: boolean) => {
        setIsUpdating(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/meet?roomId=${meetId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    inviteOnly: !checked
                })
            })
            const data = await response.json()
            if (response.ok) {
                toast({ title: "Settings updated successfully" })
                fetchMeetDetails()
            } else {
                throw new Error(data.message || "Failed to update settings")
            }
        } catch (error) {
            toast({ title: "Failed to update settings", variant: "destructive" })
        } finally {
            setIsUpdating(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchMeetDetails()
        }
    }, [open, meetId])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="dark bg-black border-zinc-800 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-white">Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {
                        meetDetails &&
                        <div className="flex items-center justify-between">
                            <Label htmlFor="join-toggle" className="text-white">
                                Anyone can join
                            </Label>
                            <Switch
                                id="join-toggle"
                                className="data-[state=checked]:bg-white data-[state=checked]:border-white"
                                checked={meetDetails?.inviteOnly === false}
                                onCheckedChange={handleInviteOnlyToggle}
                                disabled={isUpdating}
                            />
                        </div>
                    }

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


