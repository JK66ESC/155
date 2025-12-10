# aSSESSMENT tEST — Unit 155 (Inspecting Light Vehicles)

This repository contains a responsive, accessible multiple-choice assessment for Unit 155 — Inspecting Light Vehicles Using Prescribed Methods.

Features
- 100-question bank stored in `data/questions.json`
- Timed test (60 minutes) and untimed practice mode
- Choose number of questions (10/20/30/50/100)
- Accessible, high-contrast design and print-friendly results
- Review answers and printable summary

Usage
1. Open `index.html` in a browser or deploy the folder on GitHub Pages.
2. Select the number of questions and click `Start Timed Test` (60 min) or `Practice` (untimed).
3. Navigate with `Previous`/`Next` or arrow keys. Select answers with keyboard or mouse.
4. Submit to view score and review list. Use `Print / Save` to create a handout.

Focused Unit 155
- Use the `Focused: Unit 155` button on the homepage to run a concise, criteria-aligned quiz built from `data/focused_questions.json`.
- The focused set is ideal for revision of Unit 155 assessment criteria and maps to the learning outcomes in the unit specification.

CSV export
- After submission use `Export CSV` to download a CSV of questions, your answers, correct answers and a correctness flag. The CSV uses full original option wording for accuracy.

Debug distribution
- The answer-position distribution readout is hidden by default. Reveal it by adding `?debug=1` to the URL or click the `Debug` button in the header.

Deployment (GitHub Pages)
1. Push the repository to GitHub.
2. In repository settings enable GitHub Pages and set the site source to the `main` branch (root).

Accessibility
- All interactive elements are keyboard accessible.
- High-contrast colour scheme and clear focus styles.
- `aria-live` regions for dynamic status updates.

Extending the question bank
- Edit or add entries in `data/questions.json` with the schema: {id,question,options:[...],answer:index}.

License
Designed for educational use by the author. Adapt as needed for your institution.
