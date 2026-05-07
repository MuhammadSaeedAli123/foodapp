using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FoodDelivery.API.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddKitchenStaffRestaurantId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "RestaurantId",
                table: "Users",
                type: "TEXT",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                columns: new[] { "PasswordHash", "RestaurantId" },
                values: new object[] { "$2a$11$Dzs6B5EI5t2Zd5yvguriwOzB1a9BSwblBJdHLODP20/PoFe3VaI6i", null });

            migrationBuilder.CreateIndex(
                name: "IX_Users_RestaurantId",
                table: "Users",
                column: "RestaurantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Restaurants_RestaurantId",
                table: "Users",
                column: "RestaurantId",
                principalTable: "Restaurants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Restaurants_RestaurantId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_RestaurantId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RestaurantId",
                table: "Users");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                column: "PasswordHash",
                value: "$2a$11$VZnlkfhStD2PBboHDMJyuO9oLCQAqO9kKsGp9ZKgZa5Fqe9GEb8JS");
        }
    }
}
