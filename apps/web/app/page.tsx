'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Video, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useEffect, useState, Suspense } from 'react'
import landingImg from "../public/landing.png"
import Image from "next/image"
import useAuth from "@/hooks/useAuth"
import { useRouter, useSearchParams } from "next/navigation"
import { WaitingRoomModal } from "@/components/waiting"

export default function LandingPage() {
    const [currentSlide, setCurrentSlide] = useState(0)
    const { user } = useAuth()
    const router = useRouter()
    const [url, setUrl] = useState<string>("")
    const [waitModal, setWaitModal] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        let shouldWait = params.get('wait')
        if (shouldWait === "true") {
            if (!user) {
                router.push("/auth/login")
                return
            }
            let roomId = params.get('roomId')
            if (roomId) {
                setUrl(roomId)
                setWaitModal(true)
            }
        }
    }, [user]) // Depend on `user` to ensure correct execution

    const handleMeetCreation = async () => {
        if (!user) {
            router.push("/auth/login")
            return
        }
        if (!process.env.NEXT_PUBLIC_SERVER_URL) {
            console.error("NEXT_PUBLIC_SERVER_URL is not defined")
            return
        }
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/meet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creator: user.id }),
                credentials: 'include',
            });
            if (response.ok) {
                const json = await response.json();
                const id = json?.data?.id
                if (id) {
                    router.push(`/meet/${id}`)
                } else {
                    console.error("Id not found in response")
                }
            } else {
                console.error("Error occurred during meet creation")
            }
        } catch (error) {
            console.error("Error occurred: ", error)
        }
    }

    const handleMeetJoin = () => {
        setWaitModal(true)
    }

    const slides = [
        {
            title: "Get a link that you can share",
            description: "Click New meeting to get a link that you can send to people that you want to meet with"
        },
        {
            title: "Plan ahead",
            description: "Schedule meetings in your calendar and get reminders before they start"
        },
        {
            title: "Your meetings are secure",
            description: "All meetings are encrypted in transit and our safety measures are continuously updated"
        }
    ]

    return (
        <Suspense fallback={<>Loading...</>}>
            <div className="container mx-auto px-4 min-h-[calc(100vh-4rem)] flex items-center">
                <div className="grid lg:grid-cols-2 gap-12 items-center w-full max-w-6xl mx-auto">
                    {/* Left Column */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                                Video calls and meetings for everyone
                            </h1>
                            <p className="text-lg text-muted-foreground">
                                Connect, collaborate and celebrate from anywhere with our secure video chat platform
                            </p>
                        </div>

                        <div className="space-y-4 max-w-md">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button size="lg" className="w-full sm:w-auto">
                                        <Video className="mr-2 h-5 w-5" /> New meeting
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-[200px]">
                                    <DropdownMenuItem onClick={handleMeetCreation} className="cursor-pointer">
                                        <Video className="mr-2 h-4 w-4" />
                                        Start an instant meeting
                                    </DropdownMenuItem>
                                    <DropdownMenuItem disabled className="cursor-pointer">
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Schedule for later
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter a code or link"
                                    className="h-11"
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                                <Button variant="outline" size="lg" onClick={handleMeetJoin}>
                                    Join
                                </Button>
                            </div>
                        </div>

                        {waitModal && <WaitingRoomModal roomId={url} open={waitModal} onOpenChange={setWaitModal} />}

                        <p className="text-sm text-muted-foreground">
                            <a href="#" className="text-primary hover:underline">Learn more</a> about our video chat
                        </p>
                    </div>

                    {/* Right Column */}
                    <div className="relative">
                        <div className="bg-blue-50 dark:bg-blue-950 rounded-full aspect-square p-8 relative">
                            <Image
                                height={400}
                                width={400}
                                src={landingImg}
                                alt="Video chat illustration"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Carousel */}
                        <div className="mt-8 relative">
                            <div className="text-center max-w-md mx-auto">
                                <h2 className="text-xl font-semibold mb-2">{slides[currentSlide]?.title}</h2>
                                <p className="text-muted-foreground">{slides[currentSlide]?.description}</p>
                            </div>

                            <div className="flex justify-center items-center gap-2 mt-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                                    className="absolute left-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <div className="flex gap-2 justify-center">
                                    {slides.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentSlide(index)}
                                            className={`h-2 w-2 rounded-full ${currentSlide === index ? 'bg-primary' : 'bg-muted'
                                                }`}
                                        />
                                    ))}
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                                    className="absolute right-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Suspense>
    )
}