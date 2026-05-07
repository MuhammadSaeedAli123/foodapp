using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CloseTime",
                table: "Restaurants",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OpenTime",
                table: "Restaurants",
                type: "TEXT",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                column: "PasswordHash",
                value: "$2a$11$I52Gk9vlgH3m6KkwqVdXJ.YER9ExU898DJjU7FZU6Tqw16KyG0eIi");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CloseTime",
                table: "Restaurants");

            migrationBuilder.DropColumn(
                name: "OpenTime",
                table: "Restaurants");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                column: "PasswordHash",
                value: "$2a$11$N/Bu3sYfy0UwzFvamMnF9.gXYchub5YSDYkMYM1s4aN3j5n4dp5KC");
        }
    }
}
