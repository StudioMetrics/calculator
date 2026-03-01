# Future Improvements & Prompts

When we are ready to iterate on this calculator, we can feed the following prompts to Claude Code to build out the next set of features.

## 1. Currency & Layout Formatting
**Prompt for Claude Code:**
> "Update the React calculator `index.html` to properly format currency values. Add dollar signs (`$`) and comma separators for thousands in both the input fields and output displays, while ensuring the underlying React state remains as raw numbers for flawless calculations. Make sure any empty state handling doesn't display `$NaN`."

## 2. Mobile Responsiveness (For Stylists on the floor)
**Prompt for Claude Code:**
> "Refactor the UI of the calculator to be fully mobile-friendly. A hair stylist will likely be using this on their phone screen. Ensure the CSS makes the inputs stack cleanly on small viewports, the text is legible without zooming, the inputs don't trigger iOS auto-zoom, and the buttons have large, easily tappable hit areas."

## 3. Tailwind Styling (Optional Polish)
**Prompt for Claude Code:**
> "Let's upgrade the design. Add the Tailwind CSS play CDN to the head of the file. Strip out the old inline/custom styles and rewrite the UI using Tailwind utility classes. Make it look like a modern, premium SaaS tool that fits the luxury aesthetic of Studio Los Gatos."

## 4. State Persistence (Optional)
**Prompt for Claude Code:**
> "Add local storage persistence to the React state so that if the stylist refreshes the page or accidentally closes their browser tab, their entered financial values are saved and reloaded automatically."

## 5. Direct Linking to Tabs
**Prompt for Claude Code:**
> "Update the React calculator `index.html` to support URL hash routing or query parameters. The goal is to allow linking directly to a specific tab, for example `index.html#renter-to-commission`, so that when the page loads, the 'Renter → Commission' tab is active by default instead of the default 'Commission → Renter' tab."

## 6. Extract Math Logic & Add Tests
**Prompt for Claude Code:**
> "Extract all the core financial calculation logic out of `index.html` into a separate pure JavaScript/TypeScript file (e.g., `calculator.js` or `calculator.ts`). Then, set up a simple testing framework (like Vitest or Jest) and write unit tests to verify the correctness of the Commission -> Renter and Renter -> Commission math, ensuring our proportional COGS allocations and retention formulas are pixel-perfect. Update `index.html` to import and use the separated logic."
