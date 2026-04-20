# 🎓 UNCC Classroom AV Support Dashboard

Welcome to the internal Classroom AV Support dashboard! This tool is designed to be the ultimate quick-reference guide for our support technicians, providing instant access to device configurations, emergency procedures, and step-by-step troubleshooting solutions.

---

## 📱 For Standard Users (Technicians)

If you are responding to a classroom ticket, here is how you can use this platform:

*   **Search for Solutions In Seconds:** Up at the top, you'll see a search bar. If a professor calls in saying "My screen is flickering", just type "flicker" and the guide will immediately show you the exact steps to fix it.
*   **Color-Coded Tiers:** 
    *   **Blue (Tier 1):** Easy fixes. Do these before ever touching the hardware.
    *   **Green (Tier 2):** Power cycles. These involve physically resetting devices or checking the AV rack.
    *   **Red (Tier 3):** Deeper checks. These might require network configuration or replacing cables.
*   **Device Reference:** Check the bottom of the page for the "Device Reference" section. If you aren't exactly sure what a "DTP Receiver" or "Cisco Switch" looks like, those tiles have images you can click to zoom in and read exactly what each device does in the rack!
*   **Export to PDF:** Need a physical paper copy of these steps while you walk to the classroom? Just click **"📄 Export PDF"** at the top. It will magically strip away the dark backgrounds and give you a perfectly formatted, printer-friendly white document!
*   **Emergencies:** If you receive an emergency call over the intercom, click the bright red **"🚨 EMERGENCY PROCEDURE"** button at the top right for the exact script to read to 911 dispatch.

---

## 🛠️ For Administrators

Administrators have the ability to edit the existing troubleshooting tutorials or add completely new issues to the database.

**How to log in:**
1. Click the lock icon 🔒 (**Admin Login**) at the top right of the page.
2. Enter the administrator password (by default, this is `uncc-av-2024` but it can be changed in the first line of the `app.js` file).
3. You will see a green badge appear confirming you have Admin access.

**Adding or Editing Issues:**
*   Once logged in, you will notice an **"EDIT ISSUE"** and **"DELETE"** button appear on every single card. 
*   You will also see a shiny new **"+ Add Issue"** button next to the search bar.
*   Clicking Edit or Add will open a quick form where you can write down the symptoms, categorize the issue (Display, Audio, Network, etc.), and list out the steps to solve it. 

*(Note: Currently, edits made in Admin mode are stored locally in the browser memory for immediate testing and prototyping. Refreshing the browser will erase unsaved local changes. For permanent additions, reach out to the developer to persist these edits into a database).*
