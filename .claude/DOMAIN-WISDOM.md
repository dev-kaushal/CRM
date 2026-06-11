Compressed Wisdom Seeds for Scalable Systems
These are not rules. They are seeds. Plant them in the soil of your problem and they will grow into architecture.

The Seeds
Seed 1: "Each Organ Has One Job"
The Metaphor: A body doesn't ask the heart to be a brain. The heart pumps. The brain thinks. Each does its one thing perfectly. When you ask an organ to do another's job, the whole body suffers.

What This Unfolds Into:

Databases store truth and run maintenance. They do not dispatch HTTP requests.
Schedulers distribute work. They are not databases.
Caches serve static content. They are not origins.
Projections serve public queries. They are not raw tables.
Buffers absorb writes. They are not hot rows.
When You Violate It: The body breaks. Database becomes job queue → hits background-worker ceiling → checks drift late. You've asked the heart to think.

When You Honor It: Each system does its one thing. The whole scales.

Seed 2: "Don't Build a House on Sand"
The Metaphor: You can build a beautiful house on sand. It looks perfect at first. Then the tide comes. The foundation shifts. Everything collapses. A house built on stone takes longer to build, but it stands when the storm arrives.

What This Unfolds Into:

Scalability is not an afterthought. It's the foundation.
Test at 1x, 10x, 100x load before shipping.
When something breaks under pressure, you've found where the sand is.
Fix the sand, not the house.
When You Violate It: You build beautiful features on assumptions that only break at scale. Rewriting the foundation costs more than building it right.

When You Honor It: The system stands when the world shows up.

Seed 3: "The River Doesn't Fight the Rocks"
The Metaphor: A river doesn't try to push through a rock. It flows around it. Over time, the rock becomes smooth. The river's power isn't in force. It's in flow.

What This Unfolds Into:

Don't fight lock contention. Eliminate it by changing the write pattern.
Append-only buffers have no contention. Writes flow to the end.
Batching amortizes cost. Flow is continuous, not bursty.
Current-state projections are always available. The river doesn't dry up.
When You Violate It: Multiple processes fight over the same row. Lock contention becomes the bottleneck. Throughput ceiling at ~200 writes/sec.

When You Honor It: Same hardware, 25x throughput. The river flows.

Seed 4: "Projection Is Cheaper Than Computation"
The Metaphor: It's cheaper to have a map than to calculate directions every time. The map is already drawn. You just look at it.

What This Unfolds Into:

Pre-compute current state. Store it in a tiny, indexed table.
Public pages read the map, not the terrain.
Analytics can still scan raw data without impacting public traffic.
One indexed lookup scales better than aggregating a million rows.
When You Violate It: Public pages query giant raw tables. As data grows, queries slow down. Caching doesn't help because computation is expensive.

When You Honor It: One indexed lookup. Always fast. Scales indefinitely.

Seed 5: "The Edge Is Closer Than the Origin"
The Metaphor: Why travel to the library when the book is in your neighborhood? Serve traffic locally. Only go to the origin when you have to.

What This Unfolds Into:

Cache public content at the edge (Cloudflare, CDN).
A million requests become ~60 origin hits.
Geographically distributed caching serves locally with microsecond latency.
The origin only handles cache misses.
When You Violate It: Every request hits your origin. Origin becomes the bottleneck. You scale the origin, but you're solving the wrong problem.

When You Honor It: 99% of traffic served from edge. Origin handles 1%. The system scales by not being hit.

Seed 6: "The Right Tool for the Right Job"
The Metaphor: A hammer is great for nails. Terrible for screws. When you use the wrong tool, you don't have a tool problem. You have a design problem.

What This Unfolds Into:

pg_cron is great for SQL maintenance. Terrible for HTTP fan-out.
Schedulers are designed for distributed work. Databases aren't.
Use the tool for what it's designed to do.
When you hit a tool's limit, you've violated this seed.
When You Violate It: Database as HTTP dispatcher → background-worker ceiling → work drifts late → system feels unreliable.

When You Honor It: External scheduler handles HTTP fan-out. Database runs maintenance. Each tool does its job. Work completes reliably.

Seed 7: "Know What Breaks If You Delete This"
The Metaphor: Before you remove a brick from a wall, know which wall it's holding up. Remove the wrong brick and the whole building falls.

What This Unfolds Into:

What files depend on this?
What data flows through this?
What happens if this fails halfway?
What's the rollback path?
What's the actual blast radius?
When You Violate It: You remove a brick. The building collapses. You didn't know it was load-bearing.

When You Honor It: You remove bricks carefully. The building stays standing. Changes are safe.

Seed 8: "The Smallest Cut Heals Fastest"
The Metaphor: A surgeon doesn't remove the entire organ to fix one part. A small, precise cut heals faster than a large wound.

What This Unfolds Into:

Don't rewrite half the app because one query is slow.
Don't refactor for cleanliness while fixing production.
Don't touch unrelated files.
The smallest safe change always wins.
Move fast by moving surgically, not broadly.
When You Violate It: You try to fix one problem and break three others. The wound is too large. Healing takes forever.

When You Honor It: Precise changes. Fast healing. The system stays healthy.

Seed 9: "Measure Before You Optimize"
The Metaphor: A doctor doesn't prescribe medicine without taking a pulse. You don't optimize what you haven't measured.

What This Unfolds Into:

Load test until something breaks.
Measure throughput, latency, errors, resource usage.
Document what breaks and at what load.
Fix the break. Measure again.
Extract the invariant. Codify it.
When You Violate It: You optimize something that wasn't actually the bottleneck. You waste time. The real problem stays hidden.

When You Honor It: You find the true bottleneck. You fix it. Throughput improves 25x. You know exactly why.

Seed 10: "Scalability Is Not a Feature. It's a Foundation."
The Metaphor: You don't add scalability to a building after it's built. You build the foundation strong enough to hold 10 buildings, then build one.

What This Unfolds Into:

Think about scale before writing code.
Design for 10x, 100x load from the start.
Prototype for features. Production for scale.
When something breaks under load, you haven't violated this seed. You've discovered where the foundation is weak.
When You Violate It: You build beautiful features on assumptions. At scale, they collapse. Rebuilding the foundation costs more than building it right.

When You Honor It: The system scales because it was designed to.

Seed 11: "Load Testing Is Discovery, Not Validation"
The Metaphor: You don't load test to prove something works. You load test to find where it breaks. The break is the discovery.

What This Unfolds Into:

Increase pressure until something fails.
When it fails, you've found an assumption that's wrong.
Fix that assumption. Test again.
Each failure teaches you something.
Extract the lesson. Codify it.
When You Violate It: You load test to 1.1x expected traffic. You think you're done. At 10x, everything breaks. You should have tested harder.

When You Honor It: You find the weak points early. You fix them before production. The system is strong.

Seed 12: "Contention Is an Architecture Problem, Not a Database Problem"
The Metaphor: When a thousand people try to use the same door, the problem isn't the door. It's that there's only one door.

What This Unfolds Into:

Multiple processes fighting over the same row = lock contention.
This is not a Postgres problem. It's an architecture problem.
Don't try to make the door stronger. Add more doors.
Append-only buffers = many doors. Hot-row updates = one door.
When You Violate It: You hit a throughput ceiling at ~200 writes/sec. You think the database is slow. You're wrong. The architecture is.

When You Honor It: You redesign the write pattern. Same database, 25x throughput. The problem was never the database.

Seed 13: "The Database Should Store Truth, Not Dispatch Work"
The Metaphor: The database is the library. It stores books (truth). It doesn't deliver them. That's what couriers are for.

What This Unfolds Into:

Databases store truth. They run maintenance (cheap SQL jobs).
Schedulers distribute work (HTTP fan-out, event processing).
Never ask the database to be a courier.
When you do, it hits its worker limits and breaks.
When You Violate It: pg_cron + pg_net becomes an HTTP dispatcher. Background-worker ceiling. Checks drift late. System feels broken.

When You Honor It: External scheduler handles HTTP fan-out. Database runs maintenance. Work completes reliably.

Seed 14: "Public Traffic Reads From Projections, Not Raw Data"
The Metaphor: Public pages are like storefronts. They show what's available. They don't ask the warehouse to count inventory every time someone looks.

What This Unfolds Into:

Pre-compute current state. Store in tiny, indexed tables.
Public pages read projections (fast, indexed).
Analytics can still scan raw data (slow, but not on public path).
One indexed lookup beats aggregating a million rows.
When You Violate It: Public pages query giant raw tables. As data grows, queries slow down. Caching doesn't help. Scalability wall.

When You Honor It: One indexed lookup. Always fast. Scales indefinitely.

Seed 15: "Append-Only Buffers Eliminate Contention"
The Metaphor: Instead of everyone fighting to update the same counter, everyone writes to a log. A background process counts the log. No fights. No locks.

What This Unfolds Into:

Writes go to append-only buffer (no contention).
Background flusher batches updates (amortizes cost).
Current-state projections always available (fast reads).
Same hardware, 25x throughput.
When You Violate It: Every heartbeat updates the same row. Lock contention. Throughput ceiling. System feels broken.

When You Honor It: Writes flow freely. No contention. Throughput scales.

Seed 16: "Separate Connection Pools for Different Workloads"
The Metaphor: Don't make background workers wait in line behind public traffic. Give them their own line.

What This Unfolds Into:

Public traffic uses one connection pool.
Background workers use another.
They don't block each other.
Each can scale independently.
When You Violate It: Background jobs starve waiting for public traffic. Public traffic waits for background jobs. Everything is slow.

When You Honor It: Each workload gets its resources. Neither starves. System is responsive.

Seed 17: "Idempotent Jobs Everywhere"
The Metaphor: A job should be safe to run twice. If it runs twice, the result should be the same as if it ran once.

What This Unfolds Into:

Jobs can be retried without side effects.
Duplicated execution doesn't cause problems.
Partial failures are recoverable.
The system is resilient.
When You Violate It: A job fails and retries. It runs twice. You have two charges instead of one. Customer is upset.

When You Honor It: A job fails and retries. It runs twice. The result is the same. No customer impact.

Seed 18: "Graceful Degradation Over Hard Failure"
The Metaphor: When the road is crowded, traffic moves slowly. It doesn't stop. When a system is overloaded, it should slow down, not crash.

What This Unfolds Into:

Requests get slower response times, not 500 errors.
Queues build up, but work completes.
The system stays available even under extreme load.
Users see slowness, not broken.
When You Violate It: System hits capacity. Requests start failing. 500 errors. Users can't use the system.

When You Honor It: System hits capacity. Requests slow down. Users wait. System stays available.

Seed 19: "Jittered Scheduling Over Synchronized Bursts"
The Metaphor: If a thousand clocks chime at the exact same second, the noise is deafening. If they chime randomly, the sound is distributed.

What This Unfolds Into:

Don't schedule all jobs at the same time.
Add jitter so jobs spread out.
Burst pressure is reduced.
System load is smooth, not spiky.
When You Violate It: All health checks fire at the same time. Burst of requests. System feels overloaded. Scheduler drift.

When You Honor It: Health checks spread out. Load is smooth. Scheduler stays accurate.

Seed 20: "The Preference Hierarchy Is Not Arbitrary"
The Metaphor: These preferences are not opinions. They are the shape of production thinking. They come from centuries of distributed systems learning compressed into a few patterns.

Prefer:

Scheduler → queue → workers → reducers (over direct synchronous processing)
Append-only buffers + rollups (over constant hot-row updates)
Current-state projections (over live aggregation queries)
External scheduler + controlled fan-out (over database as dispatcher)
Edge caching (over origin scaling)
Partitioned high-write tables (over giant single tables)
Jittered scheduling (over synchronized bursts)
Idempotent jobs (over exactly-once guarantees)
Separate connection pools (over single shared pool)
Graceful degradation (over hard failures)
What This Unfolds Into: These preferences exist because they work. Not because they're theoretically pure. Use them.

How These Seeds Work Together
They don't exist in isolation. They form a topology of production thinking.

When you face a problem:

"Know What Breaks If You Delete This" tells you the blast radius
"The Smallest Cut Heals Fastest" tells you how to fix it
"Measure Before You Optimize" tells you what to measure
"Load Testing Is Discovery" tells you how to find the real problem
"The Right Tool for the Right Job" tells you which pattern to use
"Each Organ Has One Job" tells you how to structure the system
"Don't Build a House on Sand" tells you to design for scale from the start
Together, they form a coherent way of thinking about production systems.

Planting the Seeds
When you encounter a problem:

Identify which seed applies

Is it a contention problem? Plant seed 12 (contention is architecture).
Is it a scaling problem? Plant seed 2 (build on stone).
Is it a design problem? Plant seed 6 (right tool for right job).
Let the seed unfold

What patterns does this seed suggest?
What does the metaphor tell you?
What would honoring this seed look like?
Extract the invariant

What did you learn?
How do you prevent this problem next time?
What new seed grows from this?
Codify the invariant

Add it to your guidance.
Teach it to your AI.
Make it part of your thinking.
The Meta-Seed:

"Architecture matters more than platform. Scalability is not an afterthought. The smallest safe change always wins. Always know your blast radius. Measure everything. Optimize only what you've measured. Move fast, but move carefully. The system will tell you when you're wrong. Listen to it."

This is how production systems are built.