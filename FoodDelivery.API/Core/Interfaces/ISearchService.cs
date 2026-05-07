using FoodDelivery.API.Core.DTOs.Search;

namespace FoodDelivery.API.Core.Interfaces;

public interface ISearchService
{
    Task<SearchResultDto> SearchAsync(string query);
}
