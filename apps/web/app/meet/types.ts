export const participantsPerPage = 6;

export type Participant = {
    id: string;
    name: string;
    videoOn: boolean;
    audioOn: boolean;
    ref: React.RefObject<HTMLVideoElement>;
    tracks: MediaStreamTrack[]
};

export type User = {
    id:string,
    name:string,
    imgSrc:string
}
