# Pulse Fitness - Gym Management System

A responsive gym member management dashboard built with HTML5, CSS3, JavaScript, and Bootstrap 5. Member records are stored in the browser using `localStorage`; no server or database is required.

## Run the application

Open `index.html` in a modern browser, or open the `gym-management-system` folder in Visual Studio Code and run the page with Live Server.

Bootstrap, Bootstrap Icons, and the optional display fonts are loaded from CDNs, so an internet connection is needed for those visual assets. The app itself runs locally in the browser.

## Features

- Dashboard totals for all, active, and expired memberships
- A dark-themed public home page, dashboard, and contact page
- Interactive joining-activity chart with 7-, 30-, and 90-day ranges
- Clickable plan-mix chart, upcoming renewal reminders, and subtle 3D card tilt effects
- Membership plan pricing, payment recording, pending-payment follow-up, and transaction history
- Reports with CSV exports for member and payment records
- Recent member list and complete member directory
- Add, edit, search, and confirm-before-delete member workflows
- Contact form that prepares an email draft in the visitor's default email app
- Duplicate email prevention and required field validation
- Monthly, quarterly, and yearly membership plans
- Automatic membership status based on joining date and plan duration
- Responsive sidebar navigation for desktop and mobile
- Three sample records loaded on the first visit

## Data storage

Records are saved in the current browser under the `pulseFitnessMembers` localStorage key. Data does not sync across browsers or devices. To restore the sample data, remove that key from the browser's developer tools and reload the page.

Payment records are stored separately under `pulseFitnessPayments`. The sample plan prices are $49 monthly, $129 quarterly, and $449 yearly. Change the `PLAN_PRICES` values in `assets/js/app.js` and the displayed prices in `index.html` to use different example prices.

Payments are demo records only: this application does not process transactions or collect card details. Card is listed only as a payment method label; no card information is requested or stored.

## Contact email

The contact form uses the `CONTACT_EMAIL` value in `assets/js/app.js` to address an email draft. Replace its example address with the gym's real contact email. Sending requires an email app or handler configured in the visitor's browser.
