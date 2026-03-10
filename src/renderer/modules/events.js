/**
 * Events Management
 * Event loading, filtering, rendering, swiper carousel, and search
 */

// ==================== SWIPER (Dot & Button Navigation) ====================
function initSwiper() {
  log('Initializing swiper with dot and button navigation...');

  // Previous button
  elements.swiperPrev.addEventListener('click', () => {
    if (state.swiperIndex > 0) {
      state.swiperIndex--;
      updateSwiper();
    }
  });

  // Next button
  elements.swiperNext.addEventListener('click', () => {
    const maxIndex = Math.max(0, state.events.length - 1);
    if (state.swiperIndex < maxIndex) {
      state.swiperIndex++;
      updateSwiper();
    }
  });
}

function updateSwiper() {
  const slides = elements.eventList.querySelectorAll('.swiper-slide');
  slides.forEach((slide, index) => {
    slide.classList.toggle('active', index === state.swiperIndex);
  });
  updateSwiperButtons();
  updateSwiperDots();
}

function updateSwiperButtons() {
  const maxIndex = Math.max(0, state.events.length - 1);
  elements.swiperPrev.disabled = state.swiperIndex <= 0;
  elements.swiperNext.disabled = state.swiperIndex >= maxIndex;
}

function updateSwiperDots() {
  elements.swiperDots.innerHTML = '';

  state.events.forEach((_, index) => {
    const dot = document.createElement('div');
    dot.className = `swiper-dot${index === state.swiperIndex ? ' active' : ''}`;
    dot.addEventListener('click', () => {
      state.swiperIndex = index;
      updateSwiper();
    });
    elements.swiperDots.appendChild(dot);
  });
}

function renderEvents() {
  // This function now delegates to filterAndRenderEvents
  filterAndRenderEvents();;
}

function selectEvent(event, index) {
  // Update selection visual
  const slides = elements.eventList.querySelectorAll('.swiper-slide');
  slides.forEach((s, i) => {
    s.classList.toggle('selected', i === index);
  });

  state.selectedEvent = event;

  // Auto navigate to scan after short delay
  setTimeout(() => {
    goToScan();
  }, 300);
}

// ==================== EVENT LOADING ====================
async function loadEvents() {
  elements.loadingEvents.style.display = 'flex';
  elements.noEventMessage.style.display = 'none';
  elements.todayEventsSection.style.display = 'none';
  elements.otherEventsSection.style.display = 'none';
  elements.noSearchResults.style.display = 'none';

  try {
    // Fetch from API /api/Absensi/GetAcara
    let allEvents = [];

    try {
      log('Fetching events from API...');
      const apiData = await apiService.getAcara();

      // Map API response to use only id, nama, tanggalDari
      allEvents = (apiData || []).map(event => ({
        id: event.id,
        nama: (event.nama || '').trim(), // Remove trailing tabs/spaces
        tanggalDari: event.tanggalDari,
        keterangan: event.keterangan || ''
      }));

      log('Fetched events from API:', allEvents.length);
    } catch (apiError) {
      logError('API fetch error:', apiError.message);
      allEvents = [];
    }

    // Store all events
    state.allEvents = allEvents;

    // Group events by today and other days
    const todayStr = window.utils.getJakartaDateTime(); // Format: YYYY-MM-DD
    log('Today date:', todayStr);

    state.todayEvents = [];
    state.otherEvents = [];

    allEvents.forEach(event => {
      if (!event.tanggalDari) {
        // No date, put in other events
        state.otherEvents.push(event);
        return;
      }

      // Extract date part (YYYY-MM-DD) from tanggalDari
      const eventDate = event.tanggalDari.split('T')[0];

      if (eventDate === todayStr) {
        state.todayEvents.push(event);
      } else {
        state.otherEvents.push(event);
      }
    });

    state.events = state.todayEvents;

    log('Today events:', state.todayEvents.length);
    log('Other events:', state.otherEvents.length);

    // Apply search filter if any
    filterAndRenderEvents();

  } catch (error) {
    console.error('Error loading events:', error);
    state.allEvents = [];
    state.todayEvents = [];
    state.otherEvents = [];
    filterAndRenderEvents();
  } finally {
    elements.loadingEvents.style.display = 'none';
  }
}

function filterAndRenderEvents() {
  const query = state.searchQuery.toLowerCase().trim();

  let filteredTodayEvents = state.todayEvents;
  let filteredOtherEvents = state.otherEvents;

  if (query) {
    filteredTodayEvents = state.todayEvents.filter(event => {
      const name = (event.nama || '').toLowerCase();
      const desc = (event.keterangan || '').toLowerCase();
      return name.includes(query) || desc.includes(query);
    });

    filteredOtherEvents = state.otherEvents.filter(event => {
      const name = (event.nama || '').toLowerCase();
      const desc = (event.keterangan || '').toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  }

  // Hide all sections first
  elements.noEventMessage.style.display = 'none';
  elements.todayEventsSection.style.display = 'none';
  elements.otherEventsSection.style.display = 'none';
  elements.noSearchResults.style.display = 'none';

  const hasAnyResults = filteredTodayEvents.length > 0 || filteredOtherEvents.length > 0;

  if (!hasAnyResults) {
    if (query) {
      // No search results
      elements.noSearchResults.style.display = 'flex';
    } else {
      // No events at all
      elements.noEventMessage.style.display = 'flex';
    }
    return;
  }

  // Render today's events
  if (filteredTodayEvents.length > 0) {
    state.events = filteredTodayEvents;
    state.swiperIndex = 0;
    renderTodayEvents(filteredTodayEvents);
    elements.todayEventsSection.style.display = 'flex';
  }

  // Render other events
  if (filteredOtherEvents.length > 0) {
    renderOtherEvents(filteredOtherEvents);
    elements.otherEventsSection.style.display = 'block';
  }
}

function renderTodayEvents(events) {
  elements.eventList.innerHTML = '';
  elements.eventSwiper.style.display = 'flex';

  events.forEach((event, index) => {
    const slide = document.createElement('div');
    // Tambah class 'active' untuk slide pertama (sesuai swiperIndex)
    slide.className = `swiper-slide today-event${index === state.swiperIndex ? ' active' : ''}`;
    slide.innerHTML = `
      <h3 class="event-card-title">${escapeHtml(event.nama || 'Acara')}</h3>
      <p class="event-card-desc">${escapeHtml(event.keterangan || '')}</p>
      <div class="event-card-meta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>${formatEventDateFromTanggalDari(event.tanggalDari)}</span>
      </div>
    `;

    slide.addEventListener('click', () => selectEvent(event, index));
    elements.eventList.appendChild(slide);
  });

  updateSwiperDots();
}

function renderOtherEvents(events) {
  elements.otherEventsList.innerHTML = '';

  // Sort by date (nearest first)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.tanggalDari || 0);
    const dateB = new Date(b.tanggalDari || 0);
    return dateA - dateB;
  });

  sortedEvents.forEach((event, index) => {
    const card = document.createElement('div');
    card.className = 'other-event-card';
    card.style.animationDelay = `${index * 0.05}s`;

    const eventDate = formatEventDateFromTanggalDari(event.tanggalDari);

    card.innerHTML = `
      <h4 class="event-card-title">${escapeHtml(event.nama || 'Acara')}</h4>
      <p class="event-card-desc">${escapeHtml(event.keterangan || '')}</p>
      <div class="event-card-date">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>${eventDate}</span>
      </div>
    `;

    card.addEventListener('click', () => selectOtherEvent(event));
    elements.otherEventsList.appendChild(card);
  });
}

function selectOtherEvent(event) {
  state.selectedEvent = event;

  // Show confirmation or directly go to scan
  setTimeout(() => {
    goToScan();
  }, 200);
}

// ==================== SEARCH ====================
function handleEventSearch(query) {
  state.searchQuery = query;

  // Show/hide clear button
  if (elements.btnClearSearch) {
    elements.btnClearSearch.style.display = query ? 'flex' : 'none';
  }

  // Filter and re-render with debounce
  clearTimeout(state.searchTimeout);
  state.searchTimeout = setTimeout(() => {
    filterAndRenderEvents();
  }, 200);
}

function clearEventSearch() {
  state.searchQuery = '';
  if (elements.eventSearchInput) {
    elements.eventSearchInput.value = '';
  }
  if (elements.btnClearSearch) {
    elements.btnClearSearch.style.display = 'none';
  }
  filterAndRenderEvents();
}

async function fetchActiveEvents() {
  try {
    // Try fetching from API
    const response = await apiService.getAllAcara();
    return response || [];
  } catch (error) {
    console.error('Fetch events error:', error);
    return [];
  }
}
