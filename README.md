# OpenWhen

OpenWhen is a love letter app for intentional lovers. It helps two people create and share letters with mood, ambience, voice, and timing built around the feeling they want to send, not just the words on the page.

The project started as a personal gift idea I wanted to build years ago, and this competition gave me the reason to finally bring it to life. The goal is simple: help people feel closer by making love letters feel more immersive, thoughtful, and alive.

## What It Does

- Creates private love letters between two people.
- Lets a sender pair a letter with ambience and voice.
- Locks letters until the right moment, then opens them on a schedule.
- Sends email notifications and reminders when a letter is ready.
- Supports a soft, romantic experience designed around intimacy rather than volume.

## Demo

Live app: https://open-when-web.vercel.app/

## How I Built It

- Next.js 16 with the Pages Router for the app and API routes.
- Supabase for authentication, database storage, and scheduled reminder jobs.
- ElevenLabs for voice previews and audio generation.
- Resend for invite emails and letter notifications.
- React Query and Axios for client-side request handling.

I intentionally did not use AI to write the entire letter. The idea is for the letter to come from the heart, while the product helps with the mood, vibe, and delivery around it.

## Features

- Private partner onboarding and invite flow.
- Letter drafting, preview, and scheduled delivery.
- Audio and voice presets to shape the emotional tone.
- Locked letters that open at the right time.
- Reminder emails for letters that are ready to be opened.

## Future Work

I ran out of time before adding a few ideas I still want to build:

- AI-powered spell check and vibe check, without writing the full letter.
- Support for multiple partners.
- A proper revocation flow for when two people part ways.

## Local Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Environment Variables

This app expects the following environment variables:

```bash
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
ELEVENLABS_API_KEY=
READY_LETTER_JOB_SECRET=
```

## Project Structure

- `src/pages` contains the homepage, dashboard, auth flow, API routes, and letter routes.
- `src/components` contains the onboarding and UI components.
- `src/lib` contains the Supabase client, API helpers, presets, and shared SQL/schema assets.

## Prize Categories

Submitting for: Best Use of ElevenLabs

## Deployment

The app is deployed here: https://open-when-web.vercel.app/
