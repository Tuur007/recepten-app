// ... existing imports ...

const handleFetch = async () => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    setFetchError('Voer een URL in.');
    return;
  }
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    setFetchError('URL moet beginnen met http:// of https://');
    return;
  }

  setFetchError('');
  setFetching(true);

  try {
    const parsed = await parseRecipeFromUrl(trimmedUrl);
    form.reset({
      title: parsed.title,
      category: '',
      ingredients: parsed.ingredients.map((ing) => ({ ...ing, id: generateId() })),
      steps: parsed.steps,
      duration: parsed.duration,
    });
    setStep('edit');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Importeren mislukt.';
    setFetchError(message);
  } finally {
    setFetching(false);
  }
};
