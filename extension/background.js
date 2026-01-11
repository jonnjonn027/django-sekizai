importScripts('profileStore.js');

const buildAnalysisPayload = async (message) => {
  await profileStore.init();
  const profile = await profileStore.getProfileById(message.profileId);

  return {
    job_context: message.job_context || '',
    assessment_criteria: message.assessment_criteria || '',
    selection_text: message.selection_text || '',
    profile_text: profile?.full_text || '',
  };
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'analysis-request') {
    buildAnalysisPayload(message)
      .then((payload) => {
        sendResponse({ payload });
      })
      .catch(() => {
        sendResponse({ payload: null, error: 'Failed to build payload.' });
      });
    return true;
  }
  return false;
});
