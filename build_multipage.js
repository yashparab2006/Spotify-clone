const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync('html/index.html', 'utf8');

// Extract common head
const headMatch = indexHtml.match(/<head>([\s\S]*?)<\/head>/);
const headContent = headMatch ? headMatch[1] : '';

// Extract sidebar
const sidebarMatch = indexHtml.match(/<!-- ========== SIDEBAR ========== -->([\s\S]*?)<!-- ========== MAIN CONTENT ========== -->/);
const rawSidebar = sidebarMatch ? sidebarMatch[1] : '';

// Extract sticky nav
const navMatch = indexHtml.match(/<!-- Sticky Navigation Bar -->([\s\S]*?)<!-- ===== PAGE:/);
const rawNav = navMatch ? navMatch[1] : '';

// Extract right sidebar (rail & panel)
const rightSidebarMatch = indexHtml.match(/(<!-- ========== RIGHT SIDEBAR \(SLIDING RAIL & EXPANDED PANEL\) ========== -->[\s\S]*?)<!-- ========== MUSIC PLAYER BAR ========== -->/);
const rawRightSidebar = rightSidebarMatch ? rightSidebarMatch[1].trim() : '';

// Extract bottom player bar
const playerMatch = indexHtml.match(/<!-- ========== MUSIC PLAYER BAR ========== -->([\s\S]*?)<!-- Edit Profile Modal -->/);
const rawPlayer = playerMatch ? playerMatch[1] : '';

// Extract modals & toast & script
const modalsMatch = indexHtml.match(/<!-- Edit Profile Modal -->([\s\S]*?)<\/body>/);
const rawModals = modalsMatch ? modalsMatch[1] : '';

// Extract footer
const footerMatch = indexHtml.match(/<!-- ===== SPOTIFY FOOTER ===== -->([\s\S]*?)<\/footer>/);
const footerHtml = footerMatch ? `<!-- ===== SPOTIFY FOOTER ===== -->\n${footerMatch[1].trim()}\n</footer>` : '';

// Helper to extract page block
function getPageBlock(pageId, isVisible = true) {
    const regex = new RegExp(`<!-- ===== PAGE: [^>]*?===== -->\\s*<div class="page" id="${pageId}"[\\s\\S]*?<\\/div>\\s*(?=<!-- ===== PAGE:|<!-- ========== MUSIC PLAYER BAR|<!-- Edit Profile Modal)`, 'm');
    const match = indexHtml.match(regex);
    if (!match) {
        console.error('Could not find page block for:', pageId);
        return '';
    }
    return match[0].replace(
        new RegExp(`id="${pageId}" style="display:[^"]*"`, 'g'),
        `id="${pageId}" style="display:${isVisible ? 'block' : 'none'};"`
    );
}

// Map of pages to generate
const pages = [
    {
        filename: 'search.html',
        pageId: 'pageSearch',
        title: 'Spotify - Search',
        activeNav: 'navSearch',
        searchBarVisible: true,
        extraBlocks: []
    },
    {
        filename: 'library.html',
        pageId: 'pageLibrary',
        title: 'Spotify - Your Library',
        activeNav: 'navLibrary',
        searchBarVisible: false,
        extraBlocks: ['pagePlaylistDetail']
    },
    {
        filename: 'create-playlist.html',
        pageId: 'pageCreatePlaylist',
        title: 'Spotify - Create Playlist',
        activeNav: 'createPlaylist',
        searchBarVisible: false,
        extraBlocks: ['pagePlaylistDetail']
    },
    {
        filename: 'podcasts.html',
        pageId: 'pagePodcasts',
        title: 'Spotify - Podcasts',
        activeNav: 'podcasts',
        searchBarVisible: false,
        extraBlocks: []
    },
    {
        filename: 'premium.html',
        pageId: 'pagePremium',
        title: 'Spotify - Explore Premium',
        activeNav: 'premium',
        searchBarVisible: false,
        extraBlocks: []
    },
    {
        filename: 'profile.html',
        pageId: 'pageProfile',
        title: 'Spotify - Profile',
        activeNav: 'profile',
        searchBarVisible: false,
        extraBlocks: []
    },
    {
        filename: 'music.html',
        pageId: 'pageMusic',
        title: 'Spotify - Now Playing',
        activeNav: 'music',
        searchBarVisible: false,
        extraBlocks: []
    },
    {
        filename: 'auth.html',
        pageId: 'pageAuth',
        title: 'Spotify - Login or Sign Up',
        activeNav: 'auth',
        searchBarVisible: false,
        extraBlocks: []
    }
];

pages.forEach(p => {
    let sidebar = rawSidebar;
    sidebar = sidebar.replace(/class="nav-option active-nav"/g, 'class="nav-option"');
    sidebar = sidebar.replace(/class="lib-option nav-option active-nav"/g, 'class="lib-option nav-option"');

    if (p.activeNav === 'navSearch') {
        sidebar = sidebar.replace('id="navSearch"', 'id="navSearch" class="nav-option active-nav"');
        sidebar = sidebar.replace('class="nav-option" id="navSearch" class="nav-option active-nav"', 'class="nav-option active-nav" id="navSearch"');
    } else if (p.activeNav === 'navLibrary') {
        sidebar = sidebar.replace('class="lib-option nav-option" id="navLibrary"', 'class="lib-option nav-option active-nav" id="navLibrary"');
    } else if (p.activeNav === 'createPlaylist') {
        sidebar = sidebar.replace('id="createPlaylistBox"', 'id="createPlaylistBox" style="border: 1px solid #1ed760;"');
    } else if (p.activeNav === 'podcasts') {
        sidebar = sidebar.replace('id="browsePodcastBox"', 'id="browsePodcastBox" style="border: 1px solid #1ed760;"');
    }

    // Direct href links for seamless multi-page browsing
    sidebar = sidebar.replace('<a href="#">Home</a>', '<a href="index.html">Home</a>');
    sidebar = sidebar.replace('<a href="#">Search</a>', '<a href="search.html">Search</a>');
    sidebar = sidebar.replace('<a href="#">Your Library</a>', '<a href="library.html">Your Library</a>');

    let nav = rawNav;
    if (p.searchBarVisible) {
        nav = nav.replace('id="searchBar" style="display:none;"', 'id="searchBar" style="display:flex;"');
    } else {
        nav = nav.replace('id="searchBar" style="display:flex;"', 'id="searchBar" style="display:none;"');
    }

    // Build page content
    let mainBlocks = getPageBlock(p.pageId, true);
    p.extraBlocks.forEach(eb => {
        mainBlocks += '\n' + getPageBlock(eb, false);
    });

    // Check if mainBlocks already ends with a footer
    if (!mainBlocks.includes('class="spotify-footer"')) {
        mainBlocks += '\n\n' + footerHtml;
    }

    const pageDoc = `<!DOCTYPE html>
<html lang="en">
<head>
${headContent.replace(/<title>.*?<\/title>/, `<title>${p.title}</title>`)}
</head>
<body data-page="${p.pageId.replace('page', '').charAt(0).toLowerCase() + p.pageId.replace('page', '').slice(1)}">
    <div class="main">
        <!-- ========== SIDEBAR ========== -->
        ${sidebar.trim()}

        <!-- ========== MAIN CONTENT ========== -->
        <div class="main-content" id="mainContent">
            <!-- Sticky Navigation Bar -->
            ${nav.trim()}

            ${mainBlocks}
        </div>

        ${rawRightSidebar}

        <!-- ========== MUSIC PLAYER BAR ========== -->
        ${rawPlayer.trim()}
    </div>

    ${rawModals.trim()}
</body>
</html>`;

    fs.writeFileSync(path.join('html', p.filename), pageDoc, 'utf8');
    console.log(`Generated ${p.filename} (${pageDoc.length} bytes)`);
});
