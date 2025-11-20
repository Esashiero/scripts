const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

async function fetchMainPage() {
  try {
    const config = JSON.parse(await fs.readFile('config.json', 'utf-8'));
    const response = await axios.get(config.main_page_url);
    const outputPath = path.join('output', `${config.website_name}_main_page.html`);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, response.data);
    console.log(`Main page HTML saved to ${outputPath}`);
  } catch (error) {
    console.error('Error fetching main page:', error.message);
  }
}

fetchMainPage();
