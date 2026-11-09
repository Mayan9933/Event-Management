import { platform } from '../container.js';

export async function organizerRequest(req, res) {
  res.status(201).json(await platform.createOrganizerRequest(req.body || {}));
}
export async function listRequests(req, res) {
  res.json({ requests: await platform.listOrganizerRequests() });
}
export async function reviewRequest(req, res) {
  res.json(await platform.reviewOrganizerRequest(req.params.id, req.body?.decision, req.auth.id));
}
export async function createEvent(req, res) {
  res.status(201).json(await platform.createEvent(req.body, req.auth));
}
export async function publishedEvents(req, res) {
  res.json({ events: await platform.listPublishedEvents() });
}
export async function myEvents(req, res) {
  res.json({ events: await platform.listOrganizerEvents(req.auth.id) });
}
export async function allEvents(req, res) {
  res.json({ events: await platform.listAllEvents() });
}
export async function updateEvent(req, res) {
  res.json(await platform.updateEvent(req.params.id, req.body, req.auth));
}
export async function cancelEvent(req, res) {
  res.json(await platform.cancelEvent(req.params.id, req.auth));
}
export async function registerEvent(req, res) {
  res.status(201).json(await platform.registerForEvent(req.params.id, req.auth, req.body?.formData, req.body?.isDraft));
}
export async function myRegistrations(req, res) {
  res.json({ registrations: await platform.myRegistrations(req.auth.id) });
}
export async function eventRegistrations(req, res) {
  const result = await platform.eventRegistrations(req.params.id, req.auth);
  res.json(result);
}
export async function registrationStatus(req, res) {
  res.json(await platform.studentRegistrationStatus(req.params.id, req.auth.id));
}
export async function stats(req, res) {
  res.json({ stats: await platform.platformStats() });
}

export async function managedUsers(req, res) {
  res.json({ users: await platform.listManagedUsers() });
}
export async function deleteUser(req, res) {
  res.json(await platform.deleteManagedUser(req.params.id));
}
export async function deleteEvent(req, res) {
  res.json(await platform.deleteEvent(req.params.id, req.auth, req.body?.confirmTitle));
}
