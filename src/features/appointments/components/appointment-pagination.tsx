import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const pageSize = 5;

export function AppointmentPagination({
  page,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.ceil(totalItems / pageSize);
  if (pageCount <= 1) return null;

  return (
    <Pagination className="border-t border-slate-200 px-4 py-4 sm:px-5">
      <PaginationContent className="w-full justify-between sm:w-auto sm:justify-center">
        <PaginationItem>
          <PaginationPrevious
            aria-label="Go to previous page"
            disabled={page === 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          />
        </PaginationItem>
        <div className="flex items-center gap-1">
          {Array.from({ length: pageCount }, (_, index) => index + 1).map(
            (pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  aria-label={`Go to page ${pageNumber}`}
                  isActive={pageNumber === page}
                  onClick={() => onPageChange(pageNumber)}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
        </div>
        <PaginationItem>
          <PaginationNext
            aria-label="Go to next page"
            disabled={page === pageCount}
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export { pageSize as APPOINTMENTS_PAGE_SIZE };
