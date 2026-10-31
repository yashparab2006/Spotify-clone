// Podcast Categories & Shows
const podcastData = [
  {
    id: 1,
    name: "The Daily Tech Brief",
    category: "Technology",
    host: "Spotify Studios",
    episodes: 142,
    description: "Daily breakdown of breakthroughs in artificial intelligence, software, and gadgets.",
    cover: "/assesst/card1img.jpeg"
  },
  {
    id: 2,
    name: "Crime Solvers Society",
    category: "True Crime",
    host: "Elena Vance",
    episodes: 88,
    description: "Deep investigative journalism into mysterious events and unsolved cold cases.",
    cover: "/assesst/card2img.jpeg"
  },
  {
    id: 3,
    name: "Standup & Giggle",
    category: "Comedy",
    host: "Marcus & Friends",
    episodes: 210,
    description: "Hilarious conversations, live sketches, and comedic relief for your week.",
    cover: "/assesst/card3img.jpeg"
  },
  {
    id: 4,
    name: "Morning Global Dispatch",
    category: "News",
    host: "Global Editorial Board",
    episodes: 365,
    description: "Up-to-the-minute reports on economy, geopolitics, science, and world headlines.",
    cover: "/assesst/card4img.jpeg"
  },
  {
    id: 5,
    name: "Mind & Body Mastery",
    category: "Health & Fitness",
    host: "Dr. Maya Patel",
    episodes: 74,
    description: "Science-backed workouts, nutrition routines, and mental wellness strategies.",
    cover: "/assesst/card5img.jpeg"
  }
];

exports.getPodcasts = (req, res) => {
  const { category, q } = req.query;
  let results = [...podcastData];

  if (category) {
    results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  if (q) {
    const query = q.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.host.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }

  res.json({
    success: true,
    count: results.length,
    podcasts: results
  });
};

exports.getPodcastById = (req, res) => {
  const id = parseInt(req.params.id, 10);
  const podcast = podcastData.find(p => p.id === id);

  if (!podcast) {
    return res.status(404).json({ success: false, error: 'Podcast show not found.' });
  }

  res.json({ success: true, podcast });
};

