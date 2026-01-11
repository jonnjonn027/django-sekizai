const elements = {
  nameInput: document.getElementById('profile-name'),
  sourceInput: document.getElementById('profile-source'),
  notesInput: document.getElementById('profile-notes'),
  textInput: document.getElementById('profile-text'),
  captureButton: document.getElementById('capture-text'),
  saveButton: document.getElementById('save-profile'),
  searchInput: document.getElementById('profile-search'),
  listContainer: document.getElementById('profile-list'),
  statusMessage: document.getElementById('status-message'),
};

let selectedProfileId = null;

const setStatus = (message, isError = false) => {
  elements.statusMessage.textContent = message;
  elements.statusMessage.classList.toggle('error', isError);
};

const capturePageText = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    return '';
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const selection = window.getSelection?.().toString().trim();
      if (selection) {
        return selection;
      }
      const main = document.querySelector('main');
      if (main?.innerText) {
        return main.innerText.trim();
      }
      return document.body?.innerText?.trim() || '';
    },
  });

  return result || '';
};

const renderProfiles = (profiles) => {
  elements.listContainer.innerHTML = '';
  if (!profiles.length) {
    elements.listContainer.textContent = 'No saved profiles yet.';
    return;
  }

  profiles.forEach((profile) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'profile-item';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'selected-profile';
    radio.value = profile.id;
    radio.checked = profile.id === selectedProfileId;
    radio.addEventListener('change', () => {
      selectedProfileId = profile.id;
    });

    const details = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = profile.name || 'Untitled profile';

    const meta = document.createElement('div');
    meta.className = 'profile-meta';
    meta.textContent = [profile.source, profile.notes]
      .filter(Boolean)
      .join(' • ');

    details.appendChild(title);
    if (meta.textContent) {
      details.appendChild(meta);
    }

    wrapper.appendChild(radio);
    wrapper.appendChild(details);
    elements.listContainer.appendChild(wrapper);
  });
};

const refreshProfiles = async () => {
  const profiles = await profileStore.searchProfiles(
    elements.searchInput.value
  );
  if (!selectedProfileId && profiles.length) {
    selectedProfileId = profiles[0].id;
  }
  renderProfiles(profiles);
};

const saveProfile = async () => {
  const name = elements.nameInput.value.trim();
  const source = elements.sourceInput.value.trim();
  const notes = elements.notesInput.value.trim();
  const fullText = elements.textInput.value.trim();

  if (!name) {
    setStatus('Please provide a profile name before saving.', true);
    return;
  }

  if (!fullText) {
    setStatus('Please add profile text before saving.', true);
    return;
  }

  const saved = await profileStore.saveProfile({
    name,
    source,
    notes,
    full_text: fullText,
  });

  selectedProfileId = saved.id;
  setStatus('Profile saved.');
  await refreshProfiles();
};

const init = async () => {
  await profileStore.init();
  await refreshProfiles();
};

init();

elements.captureButton.addEventListener('click', async () => {
  setStatus('Capturing page text...');
  try {
    const text = await capturePageText();
    elements.textInput.value = text;
    setStatus(text ? 'Captured page text.' : 'No text captured.', !text);
  } catch (error) {
    setStatus('Unable to capture page text.', true);
  }
});

elements.saveButton.addEventListener('click', async () => {
  setStatus('Saving profile...');
  try {
    await saveProfile();
  } catch (error) {
    setStatus('Unable to save profile.', true);
  }
});

elements.searchInput.addEventListener('input', async () => {
  await refreshProfiles();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'get-selected-profile') {
    return Promise.resolve({ profileId: selectedProfileId });
  }
  return undefined;
});
