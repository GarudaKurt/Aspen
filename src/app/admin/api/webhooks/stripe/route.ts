const notImplemented = () =>
  new Response("This endpoint is not implemented yet.", { status: 501 });

export { notImplemented as GET, notImplemented as POST };
