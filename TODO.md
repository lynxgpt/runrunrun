# TODO
'''pick up tasks from here in order, if finish, do not delete task. mark as done, and notes (optional) '''


## phase 1
- [x] rename new project to runrunrun
  - done: repo, package name and site title are all runrunrun.
- [x] best 5k and 10k use actual best (by avg speed, no drifting)
  - done: PBs are the fastest elapsed-time window of each distance inside a run (`scripts/pb-window.mjs`); drifted windows are skipped.
- [x] geofence logic review, divide a run by 10 minutes chunk, and use each chunk's first sec gpx as this chunk's location. majority vote the location of this run. bbox should be land-river border
  - done, finer than asked: one sample per minute of moving time, each looked up in OpenStreetMap (Nominatim), majority vote (`scripts/geocode.mjs`). Offline fallback when Nominatim is down; retried every pull.
- [x] -- once finish, review current location tags. must have been many false ones.
  - done: every run relabelled from the new lookup; the before/after diff was reviewed by the owner before shipping.

- [ ] 'others' under NY state tab, paralel to manhattan Queens BK, also clickable
- [ ] 2025, 2026 year bar chart each bar clickable and as a effective filter


## phase 2 

- [ ] New bike tab parallel to run
- [ ] -- Move `Acadia_carriage_roads.gpx` out of the run pipeline and into a future `BIKE` section once biking activities have their own surface in the site.
  - note: until then this ride holds the 400m and 1K PBs (2:37/km, 2:51/km).
- [ ] New hike tab parallel to run
