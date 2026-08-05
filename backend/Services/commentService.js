const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5131/api";

async function handleResponse(response) {
  if (response.ok) {
    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  let message = "An unexpected error occurred.";

  try {
    const errorData = await response.json();

    message =
      errorData.message ||
      errorData.title ||
      message;
  } catch {
    message = `Request failed with status ${response.status}.`;
  }

  throw new Error(message);
}

export async function getTicketComments(ticketId, token) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${ticketId}/comments`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse(response);
}

export async function createTicketComment(
  ticketId,
  content,
  token
) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${ticketId}/comments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content,
      }),
    }
  );

  return handleResponse(response);
}

export async function deleteTicketComment(
  ticketId,
  commentId,
  token
) {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${ticketId}/comments/${commentId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return handleResponse(response);
}