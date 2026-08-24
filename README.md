# ✈️ SkyRipple Lite

> **Note:** This repository is an **interactive trial (lite version)** of the full **SkyRipple** engine. SkyRipple is a heavy, local-first simulation environment powered by a Python discrete-event engine, a 167MB normalized SQLite database, and Gemini-driven natural language routing. 
> 
> To make it freely deployable and accessible on the web without heavy compute costs, this **Lite** version serves a fully-featured Next.js interface loaded with **pre-computed, statically generated scenarios** directly from the real engine.

---

## 🌪️ What is SkyRipple?

**SkyRipple** is an agentic US-domestic airline delay-propagation simulator. It is an interactive control room that takes a real day of US domestic air traffic (based on Dec 2025 BTS data) and lets you watch - and provoke - how delay cascades through the system, what it costs, and how an AI operations team recovers from it.

Have you ever wondered what happens when a single runway closes at O'Hare for 2 hours? Or what the true financial cost is when a ground stop hits Atlanta? SkyRipple simulates exactly that.

### The One-Line Pitch
Type any airline disruption in plain English, watch it ripple through a full day of real US air traffic - validated against Bureau of Transportation Statistics ground truth - see it cost ~$942K, then watch a five-role agentic OCC recover it and show you the dollars saved. Every number is honest to the range.

---

## 🧠 Under the Hood: The Full SkyRipple Engine

While this **Lite** version showcases the results, the actual local SkyRipple engine runs an intense, validated pipeline:

### 1. The World Model & Data
A clean, normalized database generated from BTS On-Time, OurAirports, and the FAA registry. It simulates 343 airports, 14 carriers, 5,729 aircraft, and over 582k flight legs. The engine models 29 entity classes across three independent chains: aircraft rotation, crew pairing, and passenger itineraries.

### 2. The Synthetic World
We generate synthetic crews (~190K legal pairings), passengers (~1.95M/day, dynamically generating misconnections and rebooking logic), and ground resources (6,756 gates) to accurately mimic the constraints of a real airline network.

### 3. The Simulation Engine
A discrete-event engine (DES) operating on four channels:
- **Rotation:** Validated against real BTS data (reactionary delay correlates r≈+0.6 with real late_aircraft_delay_min).
- **Crew + Gate:** Enforces legality cliffs and gate contention.
- **Passengers:** Models misconnections and fare-prioritized rebooking.
- **Disruptions:** Injects custom delays, runway closures, capacity drops, and ground stops into the timeline.

### 4. Economics & Financial Ledger
Pure costing down to the dollar. It attributes costs across 5 categories (low/typical/high) to specific carriers and airports. 
*Example: A runway closure at ORD costs ~$942K above normal, representing a ~5× propagation multiplier over the initial direct cost!*

### 5. Agentic OCC (Operations Control Center)
When things go wrong, an AI operations team steps in. Five LLM-powered roles (Aircraft Controllers, Crew Controllers, Passenger Controllers, Gate Controllers, and a Duty Manager) propose recovery plans, re-simulate the day, and use a greedy candidate generation and LLM tie-breaker to find the most cost-effective recovery strategy. It is safe by construction: the arbitrated plan can never cost more than doing nothing.

### 6. Gemini NL Live Parsing (The "Magic")
In the full local app, you don't use dropdowns. You type: *"ground stop at Atlanta and a runway closure at Chicago."* Gemini Flash-Lite parses the intents, validates them against the engine's strict schema, and kicks off the live cascade. 

---

## 💻 About this Lite Interface

This repository contains the Next.js + TypeScript + Tailwind "Control Room" interface. It uses a bespoke design system built for data density: Space Grotesk / Inter / IBM Plex Mono typography, an aubergine base, red for disruptions, and gold reserved specifically for recovered value.

### Features you can explore in Lite:
- **FlightRadar-style Map:** Watch planes as severity-colored icons flying live paths. Click on any plane to view flight details, tail numbers, and passenger impacts (e.g., "178/178 connecting passengers stranded").
- **Dashboard & Timeline:** Scrub through the simulated day, monitor the cost curves climbing in real-time, and view per-carrier financial impacts.
- **Pre-computed Scenarios:** 
  - *ORD Runway Closure:* A massive cascade stemming from a single airport restriction.
  - *Live NL Example:* An example showing how natural language routing resolves into a specific delay simulation.

---

## 🚀 What's Next for SkyRipple (Phase 8)

The simulator currently handles single-day cascades exceptionally well. The next frontier is **The Continuous Month**:
Simulating all of December as **ONE connected simulation**. 
- An aircraft that ends the 15th delayed at ORD starts the 16th there.
- A timed-out crew isn't magically fresh the next morning. 
- A disruption on the 3rd ripples through the 4th–6th.

This will bring month-scale analytics, day/week/month aggregation toggles, rich airport-specific hover profiles, and pick-your-columns data export.

---
*Built to understand the chaos of the skies.* 🛫

