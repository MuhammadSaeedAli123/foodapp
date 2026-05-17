using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCommissionEarnings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CommissionPercentage",
                table: "Restaurants",
                type: "TEXT",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CommissionPercentage",
                table: "Orders",
                type: "TEXT",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RestaurantEarnings",
                table: "Orders",
                type: "TEXT",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "RiderEarnings",
                table: "Orders",
                type: "TEXT",
                precision: 10,
                scale: 2,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CommissionPercentage",
                table: "Restaurants");

            migrationBuilder.DropColumn(
                name: "CommissionPercentage",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RestaurantEarnings",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "RiderEarnings",
                table: "Orders");
        }
    }
}
